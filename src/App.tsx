import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Timer, BookHeart, PieChart, Calendar, Settings2, 
  Plus, Heart, Play, Clock, Smartphone, ChevronRight,
  ArrowRight, Sparkles, Target, Coffee, Zap,
  Edit3, X, Camera, ChevronLeft, Check,
  RefreshCw, Brain, Lightbulb,
  ListTodo, Moon, Utensils,
  Shield, LogOut, Download, Upload, Trash2, Database
} from 'lucide-react';

// 类型定义
type CategoryId = 'work' | 'study' | 'sleep' | 'life' | 'rest' | 'entertainment' | 'health' | 'hobby' | 'uncategorized';
type TabId = 'timer' | 'journal' | 'review' | 'plan' | 'settings';
type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

interface CategoryTheme {
  primary: string;
  light: string;
  text: string;
}

interface Journal {
  id: string;
  date: number;
  mood: string | null;
  content: string;
  images: string[];
}

interface CurrentJournal {
  content: string;
  mood: string | null;
  images: string[];
}

interface Timer {
  id: string;
  name: string;
  icon: string; // emoji图标
  categoryId: CategoryId;
  duration: number; // 分钟
  remainingTime: number; // 秒
  status: TimerStatus;
  createdAt: number;
}

interface Category {
  id: CategoryId | string;
  label: string;
  color?: string;  // 自定义分类的颜色
  isCustom?: boolean;
}

// 番茄钟设置接口
interface PomodoroSettings {
  workDuration: number;      // 工作时长（分钟）
  breakDuration: number;     // 休息时长（分钟）
  rounds: number;            // 几轮后长休息
  longBreakDuration: number; // 长休息时长（分钟）
}

// 时间记录接口 - 用于存储计时器产生的和导入的数据
interface TimeRecord {
  id: string;
  name: string;
  date: string;        // YYYY-MM-DD 格式
  startTime: string;   // HH:mm 格式
  endTime: string;     // HH:mm 格式
  source: 'timer' | 'import';  // 数据来源
  categoryId?: CategoryId;
  createdAt: number;
}

// 持久化计时器状态接口 - 用于页面关闭后恢复计时器
interface PersistentTimerState {
  // 专注页面计时器
  focusTimer: {
    activeTimerId: string | null;
    timerMode: 'countdown' | 'countup' | 'pomodoro';
    startTimestamp: number | null;  // 计时开始的时间戳
    pausedAt: number | null;        // 暂停时的剩余时间或已过时间
    totalDuration: number;          // 总时长（秒）
    pomodoroConfig: {
      workDuration: number;
      breakDuration: number;
      rounds: number;
      longBreakDuration: number;
    };
    currentPomodoroRound: number;
    pomodoroPhase: 'work' | 'break' | 'longBreak';
    status: 'idle' | 'running' | 'paused';
  } | null;
  // 今日规划页面计时器
  planTimer: {
    activeTimerId: string | null;
    timerMode: 'countdown' | 'countup' | 'pomodoro';
    startTimestamp: number | null;
    pausedAt: number | null;
    totalDuration: number;
    pomodoroConfig: {
      workDuration: number;
      breakDuration: number;
      rounds: number;
      longBreakDuration: number;
    };
    currentPomodoroRound: number;
    pomodoroPhase: 'work' | 'break' | 'longBreak';
    status: 'idle' | 'running' | 'paused';
    taskName: string;
  } | null;
}

// 持久化计时器状态的localStorage key
const PERSISTENT_TIMER_KEY = 'persistentTimerState';

// 保存计时器状态到localStorage
const savePersistentTimerState = (state: PersistentTimerState) => {
  localStorage.setItem(PERSISTENT_TIMER_KEY, JSON.stringify(state));
};

// 从localStorage读取计时器状态
const loadPersistentTimerState = (): PersistentTimerState | null => {
  const saved = localStorage.getItem(PERSISTENT_TIMER_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
};

// 计算基于时间戳的当前剩余时间或已过时间
const calculateCurrentTime = (
  startTimestamp: number,
  totalDuration: number,
  mode: 'countdown' | 'countup' | 'pomodoro'
): { remainingTime: number; elapsedTime: number; isCompleted: boolean } => {
  const now = Date.now();
  const elapsed = Math.floor((now - startTimestamp) / 1000);
  
  if (mode === 'countup') {
    return { remainingTime: 0, elapsedTime: elapsed, isCompleted: false };
  } else {
    const remaining = Math.max(0, totalDuration - elapsed);
    return { remainingTime: remaining, elapsedTime: elapsed, isCompleted: remaining <= 0 };
  }
};

// 计时器铃声 Base64 编码（默认使用简单的提示音，可通过 /upload-sound.html 页面上传自定义铃声）
// 这是一个简单的提示音 Base64（空音频占位，用户需要上传自己的铃声）
const ALARM_SOUND_BASE64 = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

// Toast 组件
const Toast = ({ message, visible, onClose }: { message: string; visible: boolean; onClose: () => void }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
      <div className="bg-gray-800 text-white px-6 py-3 rounded-2xl shadow-xl text-sm font-bold">
        {message}
      </div>
    </div>
  );
};

// 铃声播放器类
class AlarmPlayer {
  private audio: HTMLAudioElement | null = null;
  private timeoutId: number | null = null;
  
  play(duration: number = 10000) {
    this.stop(); // 先停止之前的播放
    
    // 从 localStorage 获取自定义铃声，如果没有则使用默认铃声
    const customSound = localStorage.getItem('alarmSound');
    const soundSrc = customSound || ALARM_SOUND_BASE64;
    
    this.audio = new Audio(soundSrc);
    this.audio.loop = true;
    this.audio.volume = 0.7;
    this.audio.play().catch(err => console.log('播放铃声失败:', err));
    
    // 设置自动停止
    this.timeoutId = window.setTimeout(() => {
      this.stop();
    }, duration);
  }
  
  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
  
  isPlaying() {
    return this.audio !== null && !this.audio.paused;
  }
}

// 全局铃声播放器实例
const alarmPlayer = new AlarmPlayer();

// 配置常量 - 升级版马卡龙配色 (Mixed Macaron Palette)
const MACARON_COLORS = {
  bg: '#FFFDF7',
  categories: {
    work: { primary: '#FF8CA1', light: '#FFF0F3', text: '#D9455F' },
    study: { primary: '#FFD23F', light: '#FFFBE6', text: '#B88E00' },
    sleep: { primary: '#6CB6FF', light: '#EBF5FF', text: '#2563eb' },
    life: { primary: '#B589F6', light: '#F4EBFF', text: '#7E4CCB' },
    rest: { primary: '#42D4A4', light: '#E0F9F1', text: '#1B8C69' },
    entertainment: { primary: '#FF9F1C', light: '#FFF4E6', text: '#c2410c' },
    health: { primary: '#22d3ee', light: '#E0FCFF', text: '#0891b2' },
    hobby: { primary: '#f472b6', light: '#FCE7F3', text: '#be185d' },
  } as Record<CategoryId, CategoryTheme>,
  ui: {
    primary: '#FF8CA1', 
  },
  themes: {
    timer: '#a78bfa',    // 香芋紫
    journal: '#f472b6',  // 草莓粉
    review: '#89CFF0',   // 天空蓝
    plan: '#00B894',     // 翡翠绿（与生成AI规划按钮同色）
    settings: '#fde047', // 柠檬黄
  },
  // 撞色配置
  accents: {
    timer: '#22d3ee',    // 气泡青
    journal: '#84cc16',  // 青柠绿
    review: '#fb7185',   // 樱花粉
    plan: '#fb923c',     // 蜜桃橙
    settings: '#60a5fa', // 苏打蓝
  },
  // 渐变背景
  gradients: {
    timer: 'from-purple-50 via-white to-cyan-50',
    journal: 'from-pink-50 via-white to-lime-50',
    review: 'from-sky-50 via-white to-rose-50',
    plan: 'from-[#E8F5E9] to-[#E8F5E9]',
    settings: 'from-yellow-50 via-white to-blue-50',
  },
};

// 按钮组件
const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false, 
  className = '', 
  style = {} 
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const baseStyle = `w-full h-12 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50`;
  const variants = {
    primary: `text-white shadow-[0_8px_0_0_#FF5C7C] hover:shadow-[0_6px_0_0_#FF5C7C] hover:translate-y-[2px] active:shadow-none active:translate-y-[8px]`,
    outline: `border-2 border-[#FF8CA1] text-[#FF8CA1] bg-white hover:bg-[#FFF0F5]`,
    ghost: `bg-transparent text-[#8A8A8A] text-sm font-medium h-auto py-2 hover:bg-[#F0F0F0] rounded-lg`,
  };
  
  const computedStyle = variant === 'primary' ? { backgroundColor: MACARON_COLORS.ui.primary, ...style } : style;

  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      style={computedStyle}
    >
      {children}
    </button>
  );
};

// 新手引导组件
const OnboardingView = ({ 
  onComplete 
}: { 
  onComplete: () => void 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const steps = [
    {
      id: 1,
      title: "欢迎来到治愈时光",
      subtitle: "开启你的专注之旅",
      icon: <Sparkles size={48} className="text-pink-400" />,
      description: "这里是一个温柔的时间管理空间，帮助你找到内心的平静与专注。",
      bgColor: "from-pink-100 to-purple-100"
    },
    {
      id: 2,
      title: "专注计时器",
      subtitle: "番茄工作法的治愈版本",
      icon: <Target size={48} className="text-blue-400" />,
      description: "25分钟专注，5分钟休息。让时间变得有节奏，让工作变得有温度。",
      bgColor: "from-blue-100 to-cyan-100"
    },
    {
      id: 3,
      title: "心情日记",
      subtitle: "记录每一个美好瞬间",
      icon: <Heart size={48} className="text-red-400" />,
      description: "写下今天的感受，记录生活的点点滴滴，让回忆变得更加珍贵。",
      bgColor: "from-red-100 to-pink-100"
    },
    {
      id: 4,
      title: "准备好了吗？",
      subtitle: "开始你的治愈之旅",
      icon: <Coffee size={48} className="text-amber-400" />,
      description: "一切准备就绪，让我们一起创造属于你的专注时光吧！",
      bgColor: "from-amber-100 to-orange-100"
    }
  ];

  const currentStepData = steps[currentStep - 1];

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const skipOnboarding = () => {
    onComplete();
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br ${currentStepData.bgColor} relative overflow-hidden`}>
      {/* 跳过按钮 */}
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={skipOnboarding}
          className="text-gray-400 hover:text-gray-600 text-sm font-bold px-3 py-1 rounded-full hover:bg-white/50 transition-all"
        >
          跳过
        </button>
      </div>

      {/* 装饰性背景元素 */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-white/20 rounded-full blur-xl"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

      {/* 主要内容 */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 text-center">
        {/* 图标 */}
        <div className="mb-8 animate-bounce-small">
          <div className="w-24 h-24 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-xl">
            {currentStepData.icon}
          </div>
        </div>

        {/* 标题 */}
        <h1 className="text-3xl font-black text-gray-800 mb-2">
          {currentStepData.title}
        </h1>
        <p className="text-lg text-gray-600 mb-6 font-medium">
          {currentStepData.subtitle}
        </p>

        {/* 描述 */}
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-8">
          {currentStepData.description}
        </p>

        {/* 进度指示器 */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index + 1 === currentStep 
                  ? 'bg-gray-600 w-6' 
                  : index + 1 < currentStep 
                    ? 'bg-gray-400' 
                    : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="p-6">
        <Button onClick={nextStep}>
          {currentStep === totalSteps ? (
            <>
              开始使用 <Zap size={20} />
            </>
          ) : (
            <>
              继续 <ArrowRight size={20} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

// 登录界面
const LoginView = ({ onLogin }: { onLogin: () => void }) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [step, setStep] = useState<'phone' | 'code'>('phone');

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 发送验证码
  const sendCode = () => {
    if (phone.length === 11 && countdown === 0) {
      setCountdown(60);
      setStep('code');
    }
  };

  // 登录
  const handleLogin = () => {
    if (code.length === 6) {
      onLogin();
    }
  };

  // 开发者模式快速登录
  const devLogin = () => {
    onLogin();
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-pink-50 to-blue-50">
      {/* 顶部装饰 */}
      <div className="flex-1 flex flex-col justify-center items-center px-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-blue-400 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-2xl">
            <Heart size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-800 mb-2">治愈时光</h1>
          <p className="text-gray-500 text-sm">温柔的时间管理伙伴</p>
        </div>

        {/* 登录表单 */}
        <div className="w-full max-w-xs space-y-4">
          {step === 'phone' ? (
            <>
              {/* 手机号输入 */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400">
                  <Smartphone size={18} />
                  <span className="text-sm font-bold">+86</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入手机号"
                  className="w-full h-14 pl-24 pr-4 bg-white rounded-2xl border-2 border-gray-100 focus:border-pink-300 outline-none text-gray-800 font-bold transition-all text-base"
                />
              </div>

              {/* 获取验证码按钮 */}
              <Button 
                onClick={sendCode}
                disabled={phone.length !== 11}
              >
                获取验证码
              </Button>
            </>
          ) : (
            <>
              {/* 显示手机号 */}
              <div className="text-center mb-2">
                <p className="text-sm text-gray-500">验证码已发送至</p>
                <p className="text-lg font-bold text-gray-800">+86 {phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3')}</p>
              </div>

              {/* 验证码输入 */}
              <div className="flex gap-2 justify-center">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-black transition-all ${
                      code[i] ? 'border-pink-400 bg-pink-50 text-pink-500' : 'border-gray-200 bg-white text-gray-300'
                    }`}
                  >
                    {code[i] || '·'}
                  </div>
                ))}
              </div>
              <input
                type="tel"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="opacity-0 absolute"
                autoFocus
              />

              {/* 登录按钮 */}
              <Button 
                onClick={handleLogin}
                disabled={code.length !== 6}
              >
                登录
              </Button>

              {/* 重新发送 */}
              <div className="text-center">
                {countdown > 0 ? (
                  <span className="text-sm text-gray-400">{countdown}秒后可重新发送</span>
                ) : (
                  <button onClick={sendCode} className="text-sm text-pink-500 font-bold">
                    重新发送验证码
                  </button>
                )}
              </div>

              {/* 返回修改手机号 */}
              <button 
                onClick={() => { setStep('phone'); setCode(''); }}
                className="flex items-center justify-center gap-1 text-sm text-gray-400 mx-auto"
              >
                <ChevronRight size={14} className="rotate-180" />
                修改手机号
              </button>
            </>
          )}

          {/* 协议勾选 */}
          <div className="flex items-start gap-2 px-2">
            <button
              onClick={() => setAgreed(!agreed)}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                agreed ? 'bg-pink-400 border-pink-400' : 'border-gray-300'
              }`}
            >
              {agreed && <span className="text-white text-xs">✓</span>}
            </button>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              我已阅读并同意
              <span className="text-pink-400">《用户协议》</span>
              和
              <span className="text-pink-400">《隐私政策》</span>
            </p>
          </div>

          {/* 开发者模式快速登录 */}
          <button 
            onClick={devLogin}
            className="w-full text-center text-xs text-gray-300 py-2 hover:text-gray-400 transition-colors"
          >
            开发者模式 · 跳过登录
          </button>
        </div>
      </div>
    </div>
  );
};

// 计时器视图
const TimerView = ({ 
  selectedCategory: propSelectedCategory, 
  setSelectedCategory: propSetSelectedCategory,
  timeRecords,
  setTimeRecords,
  globalTimers,
  setGlobalTimers
}: {
  selectedCategory?: CategoryId;
  setSelectedCategory?: (category: CategoryId) => void;
  timeRecords: TimeRecord[];
  setTimeRecords: (records: TimeRecord[]) => void;
  globalTimers: Timer[];
  setGlobalTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>(propSelectedCategory || 'work');
  // 同步外部传入的selectedCategory
  useEffect(() => {
    if (propSelectedCategory) {
      setSelectedCategory(propSelectedCategory);
    }
  }, [propSelectedCategory]);

  // 处理分类切换，同时通知父组件
  const handleCategoryChange = (categoryId: CategoryId) => {
    setSelectedCategory(categoryId);
    if (propSetSelectedCategory) {
      propSetSelectedCategory(categoryId);
    }
  };

  const [categories, setCategories] = useState<Category[]>([
    { id: 'work', label: '工作' },
    { id: 'study', label: '学习' },
    { id: 'sleep', label: '睡眠' },
    { id: 'life', label: '生活' },
    { id: 'rest', label: '休息' },
    { id: 'entertainment', label: '娱乐' },
    { id: 'health', label: '健康' },
    { id: 'hobby', label: '兴趣' },
  ]);
  // 使用全局timers
  const timers = globalTimers;
  const setTimers = setGlobalTimers;
  const [activeTimer, setActiveTimer] = useState<Timer | null>(null);
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null); // 记录计时开始时间
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showManageCategoryModal, setShowManageCategoryModal] = useState(false);
  const [showNewTimerModal, setShowNewTimerModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#FF8CA1');
  const [newTimerName, setNewTimerName] = useState('');
  const [newTimerIcon, setNewTimerIcon] = useState('🎯');
  const [newTimerCategory, setNewTimerCategory] = useState<CategoryId>(selectedCategory);
  
  // 编辑计时器状态
  const [showEditTimerModal, setShowEditTimerModal] = useState(false);
  const [editingTimer, setEditingTimer] = useState<Timer | null>(null);
  const [editTimerName, setEditTimerName] = useState('');
  const [editTimerIcon, setEditTimerIcon] = useState('🎯');
  const [editTimerCategory, setEditTimerCategory] = useState<CategoryId>('work');
  
  // 计时器滑动状态
  const [swipedTimerId, setSwipedTimerId] = useState<string | null>(null);
  
  // 计时模式选择弹窗状态
  const [showTimerModeModal, setShowTimerModeModal] = useState(false);
  const [pendingTimer, setPendingTimer] = useState<Timer | null>(null);
  const [timerMode, setTimerMode] = useState<'countdown' | 'countup' | 'pomodoro'>('countdown');
  const [timerDuration, setTimerDuration] = useState(25);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [_showCountdownSettings, setShowCountdownSettings] = useState(false);
  const [_showPomodoroSettingsTimer, setShowPomodoroSettingsTimer] = useState(false);
  
  // 番茄钟配置
  const [pomodoroConfig, setPomodoroConfig] = useState({
    workDuration: 25,
    breakDuration: 5,
    rounds: 4,
    longBreakDuration: 15
  });
  const [currentPomodoroRound, setCurrentPomodoroRound] = useState(1);
  const [pomodoroPhase, setPomodoroPhase] = useState<'work' | 'break' | 'longBreak'>('work');
  
  // 铃声播放状态
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  
  // 常用emoji列表
  const commonEmojis = ['🎯', '💼', '📚', '✏️', '💻', '🎨', '🎵', '🏃', '🧘', '☕', '🍎', '💪', '🌟', '🔥', '⏰', '📝', '🎮', '📖', '🧠', '💡'];
  
  // 分类列表滚动容器 ref
  const categoryListRef = useRef<HTMLDivElement>(null);
  
  // 同步newTimerCategory与selectedCategory
  useEffect(() => {
    setNewTimerCategory(selectedCategory);
  }, [selectedCategory]);

  // 计时开始时间戳（用于持久化）
  const [timerStartTimestamp, setTimerStartTimestamp] = useState<number | null>(null);

  // 从localStorage恢复计时器状态
  useEffect(() => {
    const persistentState = loadPersistentTimerState();
    if (persistentState?.focusTimer && persistentState.focusTimer.status !== 'idle') {
      const { focusTimer } = persistentState;
      const timer = globalTimers.find(t => t.id === focusTimer.activeTimerId);
      
      if (timer && focusTimer.startTimestamp) {
        // 恢复计时器模式和配置
        setTimerMode(focusTimer.timerMode);
        setPomodoroConfig(focusTimer.pomodoroConfig);
        setCurrentPomodoroRound(focusTimer.currentPomodoroRound);
        setPomodoroPhase(focusTimer.pomodoroPhase);
        
        if (focusTimer.status === 'running') {
          // 计算当前时间
          const { remainingTime, elapsedTime: elapsed, isCompleted } = calculateCurrentTime(
            focusTimer.startTimestamp,
            focusTimer.totalDuration,
            focusTimer.timerMode
          );
          
          if (isCompleted) {
            // 计时已完成，播放铃声
            alarmPlayer.play(10000);
            setIsAlarmPlaying(true);
            setTimeout(() => setIsAlarmPlaying(false), 10000);
            
            const updatedTimer = { ...timer, status: 'completed' as TimerStatus, remainingTime: 0 };
            setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
            setActiveTimer(updatedTimer);
            
            // 清除持久化状态
            savePersistentTimerState({ ...persistentState, focusTimer: null });
          } else {
            // 恢复运行状态
            setTimerStartTimestamp(focusTimer.startTimestamp);
            setElapsedTime(elapsed);
            
            const updatedTimer = { ...timer, status: 'running' as TimerStatus, remainingTime };
            setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
            setActiveTimer(updatedTimer);
          }
        } else if (focusTimer.status === 'paused' && focusTimer.pausedAt !== null) {
          // 恢复暂停状态
          if (focusTimer.timerMode === 'countup') {
            setElapsedTime(focusTimer.pausedAt);
          }
          const updatedTimer = { 
            ...timer, 
            status: 'paused' as TimerStatus, 
            remainingTime: focusTimer.timerMode === 'countup' ? 0 : focusTimer.pausedAt 
          };
          setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
          setActiveTimer(updatedTimer);
        }
      }
    }
  }, []);

  // 保存计时器状态到localStorage
  useEffect(() => {
    if (activeTimer && (activeTimer.status === 'running' || activeTimer.status === 'paused')) {
      const persistentState = loadPersistentTimerState() || { focusTimer: null, planTimer: null };
      
      const focusTimerState = {
        activeTimerId: activeTimer.id,
        timerMode,
        startTimestamp: timerStartTimestamp,
        pausedAt: activeTimer.status === 'paused' 
          ? (timerMode === 'countup' ? elapsedTime : activeTimer.remainingTime)
          : null,
        totalDuration: timerMode === 'countup' ? 0 : activeTimer.duration * 60,
        pomodoroConfig,
        currentPomodoroRound,
        pomodoroPhase,
        status: activeTimer.status as 'running' | 'paused'
      };
      
      savePersistentTimerState({ ...persistentState, focusTimer: focusTimerState });
    } else if (!activeTimer || activeTimer.status === 'idle' || activeTimer.status === 'completed') {
      // 清除持久化状态
      const persistentState = loadPersistentTimerState();
      if (persistentState) {
        savePersistentTimerState({ ...persistentState, focusTimer: null });
      }
    }
  }, [activeTimer?.status, activeTimer?.id, timerStartTimestamp, elapsedTime, timerMode, pomodoroConfig, currentPomodoroRound, pomodoroPhase]);

  // 计时器逻辑
  useEffect(() => {
    let interval: number;
    
    if (activeTimer && activeTimer.status === 'running') {
      interval = window.setInterval(() => {
        if (timerMode === 'countup') {
          // 正计时模式
          setElapsedTime(prev => prev + 1);
        } else if (timerMode === 'countdown') {
          // 倒计时模式
          setActiveTimer(prev => {
            if (!prev || prev.remainingTime <= 0) {
              setTimers(timers => timers.map(t => 
                t.id === prev?.id ? { ...t, status: 'completed' as TimerStatus, remainingTime: 0 } : t
              ));
              // 倒计时结束，播放铃声
              alarmPlayer.play(10000);
              setIsAlarmPlaying(true);
              setTimeout(() => setIsAlarmPlaying(false), 10000);
              return prev ? { ...prev, status: 'completed', remainingTime: 0 } : null;
            }
            
            const updated = { ...prev, remainingTime: prev.remainingTime - 1 };
            setTimers(timers => timers.map(t => 
              t.id === prev.id ? updated : t
            ));
            return updated;
          });
        } else if (timerMode === 'pomodoro') {
          // 番茄钟模式
          setActiveTimer(prev => {
            if (!prev) return null;
            
            if (prev.remainingTime <= 1) {
              // 当前阶段结束，播放铃声提醒
              alarmPlayer.play(10000);
              setIsAlarmPlaying(true);
              setTimeout(() => setIsAlarmPlaying(false), 10000);
              
              // 切换到下一阶段
              if (pomodoroPhase === 'work') {
                if (currentPomodoroRound >= pomodoroConfig.rounds) {
                  setPomodoroPhase('longBreak');
                  setCurrentPomodoroRound(1);
                  const newRemaining = pomodoroConfig.longBreakDuration * 60;
                  const updated = { ...prev, remainingTime: newRemaining };
                  setTimers(timers => timers.map(t => t.id === prev.id ? updated : t));
                  // 更新时间戳
                  setTimerStartTimestamp(Date.now());
                  return updated;
                } else {
                  setPomodoroPhase('break');
                  const newRemaining = pomodoroConfig.breakDuration * 60;
                  const updated = { ...prev, remainingTime: newRemaining };
                  setTimers(timers => timers.map(t => t.id === prev.id ? updated : t));
                  // 更新时间戳
                  setTimerStartTimestamp(Date.now());
                  return updated;
                }
              } else if (pomodoroPhase === 'break') {
                setPomodoroPhase('work');
                setCurrentPomodoroRound(r => r + 1);
                const newRemaining = pomodoroConfig.workDuration * 60;
                const updated = { ...prev, remainingTime: newRemaining };
                setTimers(timers => timers.map(t => t.id === prev.id ? updated : t));
                // 更新时间戳
                setTimerStartTimestamp(Date.now());
                return updated;
              } else {
                // 长休息结束
                setTimers(timers => timers.map(t => 
                  t.id === prev.id ? { ...t, status: 'completed' as TimerStatus, remainingTime: 0 } : t
                ));
                setPomodoroPhase('work');
                return { ...prev, status: 'completed', remainingTime: 0 };
              }
            }
            
            const updated = { ...prev, remainingTime: prev.remainingTime - 1 };
            setTimers(timers => timers.map(t => t.id === prev.id ? updated : t));
            return updated;
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer?.status, activeTimer?.id, timerMode, pomodoroPhase, currentPomodoroRound, pomodoroConfig]);

  // 监听计时器完成，保存记录
  useEffect(() => {
    if (activeTimer?.status === 'completed' && timerStartTime) {
      saveTimeRecord(activeTimer, timerStartTime, new Date());
      setTimerStartTime(null);
    }
  }, [activeTimer?.status]);

  const theme = selectedCategory === 'uncategorized' 
    ? { primary: '#9ca3af', light: '#f3f4f6', text: '#6b7280' }
    : (MACARON_COLORS.categories[selectedCategory as CategoryId] || {
        primary: '#FF8CA1',
        light: '#FFF0F3', 
        text: '#D9455F'
      });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory: Category = {
        id: `custom_${Date.now()}`,
        label: newCategoryName.trim(),
        color: newCategoryColor,
        isCustom: true
      };
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      setNewCategoryColor('#FF8CA1');
      setShowNewCategoryModal(false);
    }
  };

  const addTimer = () => {
    if (newTimerName.trim()) {
      const timer: Timer = {
        id: Date.now().toString(),
        name: newTimerName.trim(),
        icon: newTimerIcon,
        categoryId: newTimerCategory,
        duration: 25, // 默认时长，实际使用时会在模式选择中设置
        remainingTime: 25 * 60,
        status: 'idle',
        createdAt: Date.now()
      };
      setTimers([...timers, timer]);
      setNewTimerName('');
      setNewTimerIcon('🎯');
      setNewTimerCategory(selectedCategory);
      setShowNewTimerModal(false);
    }
  };
  
  // 打开计时模式选择弹窗
  const openTimerModeModal = (timer: Timer) => {
    setPendingTimer(timer);
    setTimerDuration(25);
    setPomodoroConfig({
      workDuration: 25,
      breakDuration: 5,
      rounds: 4,
      longBreakDuration: 15
    });
    setShowTimerModeModal(true);
  };
  
  // 确认开始计时
  const confirmStartTimer = () => {
    if (!pendingTimer) return;
    
    // 暂停其他正在运行的计时器
    setTimers(prev => prev.map(t => 
      t.status === 'running' ? { ...t, status: 'paused' as TimerStatus } : t
    ));
    
    let remainingTime = 0;
    if (timerMode === 'countdown') {
      remainingTime = timerDuration * 60;
    } else if (timerMode === 'pomodoro') {
      remainingTime = pomodoroConfig.workDuration * 60;
      setPomodoroPhase('work');
      setCurrentPomodoroRound(1);
    } else {
      remainingTime = 0;
      setElapsedTime(0);
    }
    
    // 记录开始时间
    setTimerStartTime(new Date());
    // 记录开始时间戳（用于持久化）
    setTimerStartTimestamp(Date.now());
    
    const updatedTimer = { 
      ...pendingTimer, 
      status: 'running' as TimerStatus,
      duration: timerMode === 'countdown' ? timerDuration : (timerMode === 'pomodoro' ? pomodoroConfig.workDuration : 0),
      remainingTime 
    };
    setTimers(prev => prev.map(t => t.id === pendingTimer.id ? updatedTimer : t));
    setActiveTimer(updatedTimer);
    setShowTimerModeModal(false);
    setPendingTimer(null);
  };
  
  // 保存计时记录到timeRecords
  const saveTimeRecord = (timer: Timer, startTime: Date, endTime: Date) => {
    const formatTimeStr = (date: Date) => {
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };
    const formatDateStr = (date: Date) => {
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    };
    
    const newRecord: TimeRecord = {
      id: `timer_${Date.now()}`,
      name: timer.name,
      date: formatDateStr(startTime),
      startTime: formatTimeStr(startTime),
      endTime: formatTimeStr(endTime),
      source: 'timer',
      categoryId: timer.categoryId,
      createdAt: Date.now()
    };
    
    setTimeRecords([...timeRecords, newRecord]);
  };

  const startTimer = (timer: Timer) => {
    // 打开计时模式选择弹窗
    openTimerModeModal(timer);
  };

  const pauseTimer = (timer: Timer) => {
    const updatedTimer = { ...timer, status: 'paused' as TimerStatus };
    setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
    setActiveTimer(updatedTimer);
  };

  const resetTimer = (timer: Timer) => {
    // 保存计时记录（如果有开始时间）
    if (timerStartTime && activeTimer?.id === timer.id) {
      saveTimeRecord(timer, timerStartTime, new Date());
    }
    
    const updatedTimer = { 
      ...timer, 
      status: 'idle' as TimerStatus, 
      remainingTime: timer.duration * 60 
    };
    setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
    if (activeTimer?.id === timer.id) {
      setActiveTimer(null);
      setTimerStartTime(null);
    }
    setElapsedTime(0);
    setPomodoroPhase('work');
    setCurrentPomodoroRound(1);
  };

  // 跳过当前番茄钟阶段（提前休息/提前结束休息）
  const skipPomodoroPhase = (timer: Timer) => {
    if (timerMode !== 'pomodoro' || !activeTimer) return;
    
    let newRemainingTime = 0;
    
    if (pomodoroPhase === 'work') {
      // 当前是专注阶段，跳到休息
      if (currentPomodoroRound >= pomodoroConfig.rounds) {
        // 已经是最后一轮，直接完成番茄钟
        const updatedTimer = { ...timer, status: 'completed' as TimerStatus, remainingTime: 0 };
        setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
        setActiveTimer(updatedTimer);
        setPomodoroPhase('work');
        setCurrentPomodoroRound(1);
        return;
      } else {
        // 进入短休息
        setPomodoroPhase('break');
        newRemainingTime = pomodoroConfig.breakDuration * 60;
      }
    } else if (pomodoroPhase === 'break') {
      // 当前是短休息，跳到下一轮专注
      setPomodoroPhase('work');
      setCurrentPomodoroRound(prev => prev + 1);
      newRemainingTime = pomodoroConfig.workDuration * 60;
    } else {
      // 当前是长休息，完成番茄钟
      const updatedTimer = { ...timer, status: 'completed' as TimerStatus, remainingTime: 0 };
      setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
      setActiveTimer(updatedTimer);
      setPomodoroPhase('work');
      setCurrentPomodoroRound(1);
      return;
    }
    
    const updatedTimer = { ...timer, remainingTime: newRemainingTime };
    setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
    setActiveTimer(updatedTimer);
  };

  const deleteTimer = (timerId: string) => {
    setTimers(prev => prev.filter(t => t.id !== timerId));
    if (activeTimer?.id === timerId) {
      setActiveTimer(null);
    }
  };

  // 打开编辑计时器弹窗
  const openEditTimerModal = (timer: Timer) => {
    setEditingTimer(timer);
    setEditTimerName(timer.name);
    setEditTimerIcon(timer.icon);
    setEditTimerCategory(timer.categoryId);
    setShowEditTimerModal(true);
  };

  // 保存编辑的计时器
  const saveEditTimer = () => {
    if (!editingTimer || !editTimerName.trim()) return;
    
    const updatedTimer = {
      ...editingTimer,
      name: editTimerName.trim(),
      icon: editTimerIcon,
      categoryId: editTimerCategory
    };
    
    setTimers(prev => prev.map(t => t.id === editingTimer.id ? updatedTimer : t));
    
    // 如果是当前活动的计时器，也更新activeTimer
    if (activeTimer?.id === editingTimer.id) {
      setActiveTimer(updatedTimer);
    }
    
    setShowEditTimerModal(false);
    setEditingTimer(null);
  };

  const categoryTimers = timers.filter(t => t.categoryId === selectedCategory);

  // 获取当前分类的主题色
  const currentCategoryTheme = MACARON_COLORS.categories[selectedCategory] || {
    primary: '#9ca3af',
    light: '#F9F9F9',
    text: '#6b7280'
  };
  
  // 将hex颜色转换为带透明度的rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  // 背景色：主色 + 4% 不透明度 (96% 透明度)
  const categoryBgColor = hexToRgba(currentCategoryTheme.primary, 0.04);

  return (
    <div className="flex h-full relative overflow-hidden" style={{ backgroundColor: categoryBgColor }}>
      {/* 背景装饰 */}
      <div className="absolute bottom-10 left-10 w-24 h-24 rounded-full bg-cyan-100 blur-xl opacity-40 animate-pulse"></div>
      <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-purple-100 blur-xl opacity-50"></div>
      
      {/* 侧边栏 */}
      <div 
        className="w-[70px] h-full flex flex-col items-center py-6 border-r border-gray-200 z-10 transition-colors duration-300" 
        style={{ backgroundColor: categoryBgColor }}
      >
        {/* 管理分类按钮 - 置顶 */}
        <button 
          onClick={() => setShowManageCategoryModal(true)}
          className="w-[calc(100%-8px)] mx-1 py-2 mb-4 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-white/80 hover:scale-105 border-2 border-dashed border-gray-300"
        >
          <Settings2 size={14} className="text-gray-400 mb-1" />
          <span className="text-[8px] font-black text-gray-400">管理分类</span>
        </button>
        
        <div className="space-y-2 w-full flex flex-col items-center px-1 pt-1 flex-1 overflow-y-auto">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            const catTheme = MACARON_COLORS.categories[cat.id as CategoryId] || {
              primary: cat.color || '#FF8CA1',
              light: '#FFF0F3',
              text: '#D9455F'
            };
            return (
              <button 
                key={cat.id} 
                onClick={() => handleCategoryChange(cat.id as CategoryId)}
                className={`relative w-full py-3 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${isSelected ? 'shadow-lg scale-105 bg-white border-2' : 'hover:bg-white/40 hover:scale-105'}`}
                style={{ 
                  borderColor: isSelected ? catTheme.primary : 'transparent',
                  backgroundColor: isSelected ? 'white' : 'transparent'
                }}
              >
                <span 
                  className="text-[10px] font-black"
                  style={{ color: isSelected ? catTheme.primary : '#9ca3af' }}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
          
          {/* 待分类 - 固定在底部 */}
          <button 
            onClick={() => handleCategoryChange('uncategorized' as CategoryId)}
            className={`relative w-full py-3 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 mt-auto ${selectedCategory === 'uncategorized' ? 'shadow-lg scale-105 bg-white border-2 border-gray-400' : 'hover:bg-white/40 hover:scale-105'}`}
          >
            <span 
              className="text-[10px] font-black"
              style={{ color: selectedCategory === 'uncategorized' ? '#9ca3af' : '#d1d5db' }}
            >
              待分类
            </span>
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div 
        className="flex-1 flex flex-col h-full relative overflow-hidden z-10 transition-colors duration-300"
        style={{ backgroundColor: categoryBgColor }}
        onClick={() => swipedTimerId && setSwipedTimerId(null)}
      >
        <div className="px-6 pt-8 pb-3">
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {categoryTimers.length === 0 ? (
            // 空状态
            <div className="flex-1 flex flex-col items-center justify-center">
              <button 
                onClick={() => setShowNewTimerModal(true)}
                className="px-8 py-6 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 font-bold hover:border-gray-400 hover:text-gray-500 hover:bg-white/50 active:scale-95 transition-all flex flex-col items-center gap-3"
              >
                <span>创建「{selectedCategory === 'uncategorized' ? '待分类' : categories.find(c => c.id === selectedCategory)?.label}」的第一个计时器吧～</span>
                <Plus size={32} strokeWidth={2} />
              </button>
            </div>
          ) : (
            // 计时器列表 - 两列网格
            <div className="grid grid-cols-2 gap-3">
              {categoryTimers.map(timer => {
                const isTimerActive = activeTimer?.id === timer.id && (timer.status === 'running' || timer.status === 'paused');
                const isSwiped = swipedTimerId === timer.id;
                const theme = MACARON_COLORS.categories[timer.categoryId as CategoryId] || {
                  primary: '#9ca3af',
                  light: '#f3f4f6',
                  text: '#6b7280'
                };
                
                return (
                <div 
                  key={timer.id}
                  className="relative overflow-hidden rounded-2xl"
                >
                  {/* 背景操作按钮 */}
                  {/* 背景操作按钮 - 只在滑动时显示 */}
                  <div 
                    className={`absolute right-0 top-0 bottom-0 flex items-center transition-opacity duration-300 ${isSwiped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditTimerModal(timer);
                        setSwipedTimerId(null);
                      }}
                      className="h-full w-12 flex items-center justify-center text-white"
                      style={{ backgroundColor: '#5C7CFA' }}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTimer(timer.id);
                        setSwipedTimerId(null);
                      }}
                      className="h-full w-12 flex items-center justify-center text-white rounded-r-2xl"
                      style={{ backgroundColor: '#FF6B6B' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {/* 卡片内容 - 可滑动 */}
                  <div 
                    className={`relative w-full rounded-2xl p-3 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] bg-white border-2 border-white transition-transform duration-300 ${
                      activeTimer?.id === timer.id ? 'ring-2 ring-purple-100' : ''
                    }`}
                    style={{ 
                      borderColor: timer.status === 'running' ? theme.primary : 
                                  timer.status === 'completed' ? '#42D4A4' : 'white',
                      transform: isSwiped ? 'translateX(-96px)' : 'translateX(0)',
                      touchAction: 'pan-y'
                    }}
                    onTouchStart={(e) => {
                      const touch = e.touches[0];
                      const target = e.currentTarget as HTMLElement;
                      target.dataset.startX = String(touch.clientX);
                      target.dataset.startY = String(touch.clientY);
                    }}
                    onTouchEnd={(e) => {
                      const target = e.currentTarget as HTMLElement;
                      const startX = Number(target.dataset.startX || 0);
                      const startY = Number(target.dataset.startY || 0);
                      const touch = e.changedTouches[0];
                      const diffX = startX - touch.clientX;
                      const diffY = Math.abs(touch.clientY - startY);
                      
                      // 水平滑动距离大于50且大于垂直滑动距离
                      if (diffX > 50 && diffX > diffY * 2) {
                        // 向左滑动
                        setSwipedTimerId(timer.id);
                      } else if (diffX < -50 && Math.abs(diffX) > diffY * 2) {
                        // 向右滑动
                        setSwipedTimerId(null);
                      } else if (Math.abs(diffX) < 10 && diffY < 10) {
                        // 点击（几乎没有移动）
                        if (isSwiped) {
                          setSwipedTimerId(null);
                        }
                      }
                    }}
                  >
                  {/* 更多按钮 - 右上角 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSwipedTimerId(isSwiped ? null : timer.id);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-lg flex flex-col items-center justify-center gap-[2px] hover:bg-gray-100 transition-all"
                  >
                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                  </button>
                  
                  {/* 卡片主体 - 垂直布局 */}
                  <div className="flex flex-col items-center text-center">
                    {isTimerActive ? (
                      // 计时中的内容
                      <>
                        {/* 模式标签 */}
                        <div className="flex justify-center mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            timerMode === 'countup' ? 'bg-blue-100 text-blue-600' :
                            timerMode === 'pomodoro' ? 'bg-red-100 text-red-600' :
                            'bg-green-100 text-green-600'
                          }`}>
                            {timerMode === 'countup' ? '⏱️ 正计时' :
                             timerMode === 'pomodoro' ? `🍅 ${pomodoroPhase === 'work' ? '专注' : '休息'}` :
                             '⏳ 倒计时'}
                          </span>
                        </div>
                        
                        {/* 番茄钟轮次显示 */}
                        {timerMode === 'pomodoro' && (
                          <div className="text-[10px] text-gray-500 mb-1">
                            第 {currentPomodoroRound} / {pomodoroConfig.rounds} 轮
                          </div>
                        )}
                        
                        {/* 计时显示 */}
                        <div className="text-2xl font-black text-[#2D3436] font-mono mb-1">
                          {timerMode === 'countup' ? formatTime(elapsedTime) : formatTime(timer.remainingTime)}
                        </div>
                        <p className="text-[10px] text-gray-500 mb-2">
                          {timer.status === 'running' ? 
                            (timerMode === 'pomodoro' && pomodoroPhase !== 'work' ? '休息中...' : '专注中...') : 
                            '已暂停'}
                        </p>
                        
                        {/* 控制按钮 */}
                        <div className="flex justify-center gap-2">
                          {timer.status === 'running' ? (
                            <button
                              onClick={() => pauseTimer(timer)}
                              className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-all"
                            >
                              <div className="flex gap-0.5">
                                <div className="w-0.5 h-3 bg-gray-400 rounded-sm"></div>
                                <div className="w-0.5 h-3 bg-gray-400 rounded-sm"></div>
                              </div>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const updatedTimer = { ...timer, status: 'running' as TimerStatus };
                                setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
                                setActiveTimer(updatedTimer);
                              }}
                              className="w-10 h-10 rounded-full bg-[#00B894] flex items-center justify-center text-white shadow-lg hover:bg-[#00a383] transition-all"
                            >
                              <Play size={16} />
                            </button>
                          )}
                          {/* 番茄钟跳过按钮 */}
                          {timerMode === 'pomodoro' && (
                            <button
                              onClick={() => skipPomodoroPhase(timer)}
                              className="px-2 h-8 rounded-full border-2 border-orange-300 flex items-center justify-center text-orange-400 hover:border-orange-400 hover:text-orange-500 transition-all text-[10px] font-bold"
                            >
                              跳过
                            </button>
                          )}
                          <button
                            onClick={() => resetTimer(timer)}
                            className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-all"
                          >
                            <X size={14} />
                          </button>
                          {/* 停止铃声按钮 */}
                          {isAlarmPlaying && (
                            <button
                              onClick={() => {
                                alarmPlayer.stop();
                                setIsAlarmPlaying(false);
                              }}
                              className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white shadow-lg hover:bg-pink-600 transition-all animate-pulse text-sm"
                            >
                              🔔
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      // 默认内容
                      <>
                        <div 
                          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm text-2xl mb-2"
                          style={{ backgroundColor: theme.light }}
                        >
                          {timer.icon}
                        </div>
                        <h4 className="text-sm font-bold text-[#2D2D2D] truncate w-full px-1">{timer.name}</h4>
                        
                        {/* 状态按钮 */}
                        {timer.status === 'completed' ? (
                          <button 
                            onClick={() => resetTimer(timer)}
                            className="w-full mt-2 py-2 rounded-xl flex items-center justify-center text-white font-bold text-xs active:scale-98 transition-all"
                            style={{ backgroundColor: '#42D4A4' }}
                          >
                            <RefreshCw size={14} className="mr-1" />
                            重置
                          </button>
                        ) : (
                          <button 
                            onClick={() => startTimer(timer)}
                            className="w-full mt-2 py-2 rounded-xl flex items-center justify-center font-bold text-xs active:scale-98 transition-all hover:brightness-95"
                            style={{ backgroundColor: theme.light, color: theme.primary }}
                          >
                            开始计时
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  </div>
                </div>
              )})}
              
              {/* 添加计时器按钮 */}
              <div 
                onClick={() => setShowNewTimerModal(true)}
                className="relative rounded-2xl p-3 bg-white border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 active:scale-98 transition-all cursor-pointer flex items-center justify-center"
              >
                <Plus size={32} className="text-gray-400" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 新增分类弹窗 */}
      {showNewCategoryModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white w-[85%] rounded-[2rem] p-6 shadow-2xl animate-scale-in">
            <h3 className="text-xl font-black text-[#2D2D2D] mb-4 text-center">新增分类</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-600 block mb-2">分类名称</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="输入分类名称..."
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-base outline-none focus:bg-white focus:ring-2 focus:ring-purple-200"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="text-sm font-bold text-gray-600 block mb-2">选择颜色</label>
                <div className="grid grid-cols-6 gap-2">
                  {['#FF8CA1', '#FFD23F', '#42D4A4', '#B589F6', '#6CB6FF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        newCategoryColor === color ? 'ring-4 ring-gray-300 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {newCategoryColor === color && (
                        <span className="text-white text-lg font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNewCategoryModal(false);
                  setNewCategoryName('');
                  setNewCategoryColor('#FF8CA1');
                }}
                className="flex-1"
              >
                取消
              </Button>
              <Button 
                onClick={addCategory}
                disabled={!newCategoryName.trim()}
                className="flex-1"
                style={{ backgroundColor: newCategoryColor }}
              >
                创建分类
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 新增计时器弹窗 */}
      {showNewTimerModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white w-[90%] rounded-3xl p-6 shadow-2xl animate-scale-in max-h-[85%] overflow-y-auto">
            <h3 className="text-xl font-black text-[#2D2D2D] mb-4 text-center">新增计时器</h3>
            
            <div className="space-y-4">
              {/* 选择图标 */}
              <div>
                <label className="text-sm font-bold text-gray-600 block mb-2">选择图标</label>
                <div className="grid grid-cols-10 gap-2">
                  {commonEmojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setNewTimerIcon(emoji)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all ${
                        newTimerIcon === emoji ? 'bg-purple-100 ring-2 ring-purple-400 scale-110' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">也可以直接输入其他emoji：</p>
                <input
                  type="text"
                  value={newTimerIcon}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) setNewTimerIcon(value.slice(-2)); // 取最后一个emoji
                  }}
                  className="w-20 bg-gray-50 rounded-xl px-3 py-2 text-center text-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-200 mt-2"
                />
              </div>
              
              {/* 计时器名称 */}
              <div>
                <label className="text-sm font-bold text-gray-600 block mb-2">计时器名称</label>
                <input
                  type="text"
                  value={newTimerName}
                  onChange={(e) => setNewTimerName(e.target.value)}
                  placeholder="输入计时器名称..."
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-base outline-none focus:bg-white focus:ring-2 focus:ring-pink-200"
                />
              </div>
              
              {/* 选择分类 */}
              <div>
                <label className="text-sm font-bold text-gray-600 block mb-2">选择分类</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => {
                    const catTheme = MACARON_COLORS.categories[cat.id as CategoryId] || {
                      primary: cat.color || '#FF8CA1',
                      light: '#FFF0F3',
                      text: '#D9455F'
                    };
                    const isSelected = newTimerCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setNewTimerCategory(cat.id as CategoryId)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          isSelected ? 'text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                        style={{ 
                          backgroundColor: isSelected ? catTheme.primary : undefined
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNewTimerModal(false);
                  setNewTimerName('');
                  setNewTimerIcon('🎯');
                  setNewTimerCategory(selectedCategory);
                }}
                className="flex-1"
              >
                取消
              </Button>
              <Button 
                onClick={addTimer}
                disabled={!newTimerName.trim()}
                className="flex-1"
                style={{ backgroundColor: theme.primary }}
              >
                创建计时器
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑计时器弹窗 */}
      {showEditTimerModal && editingTimer && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white w-[90%] rounded-3xl p-6 shadow-2xl animate-scale-in max-h-[85%] overflow-y-auto">
            <h3 className="text-xl font-black text-[#2D2D2D] mb-4 text-center">编辑计时器</h3>
            
            <div className="space-y-4">
              {/* 选择图标 */}
              <div>
                <label className="text-sm font-bold text-gray-600 block mb-2">选择图标</label>
                <div className="grid grid-cols-10 gap-2">
                  {commonEmojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setEditTimerIcon(emoji)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all ${
                        editTimerIcon === emoji ? 'bg-purple-100 ring-2 ring-purple-400 scale-110' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">也可以直接输入其他emoji：</p>
                <input
                  type="text"
                  value={editTimerIcon}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) setEditTimerIcon(value.slice(-2));
                  }}
                  className="w-20 bg-gray-50 rounded-xl px-3 py-2 text-center text-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-200 mt-2"
                />
              </div>
              
              {/* 计时器名称 */}
              <div>
                <label className="text-sm font-bold text-gray-600 block mb-2">计时器名称</label>
                <input
                  type="text"
                  value={editTimerName}
                  onChange={(e) => setEditTimerName(e.target.value)}
                  placeholder="输入计时器名称..."
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-base outline-none focus:bg-white focus:ring-2 focus:ring-pink-200"
                />
              </div>
              
              {/* 选择分类 */}
              <div>
                <label className="text-sm font-bold text-gray-600 block mb-2">选择分类</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => {
                    const catTheme = MACARON_COLORS.categories[cat.id as CategoryId] || {
                      primary: cat.color || '#FF8CA1',
                      light: '#FFF0F3',
                      text: '#D9455F'
                    };
                    const isSelected = editTimerCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setEditTimerCategory(cat.id as CategoryId)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          isSelected ? 'text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                        style={{ 
                          backgroundColor: isSelected ? catTheme.primary : undefined
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditTimerModal(false);
                  setEditingTimer(null);
                }}
                className="flex-1"
              >
                取消
              </Button>
              <Button 
                onClick={saveEditTimer}
                disabled={!editTimerName.trim()}
                className="flex-1"
                style={{ backgroundColor: theme.primary }}
              >
                保存修改
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 计时模式选择弹窗 */}
      {showTimerModeModal && pendingTimer && (
        <div 
          className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center animate-fade-in"
          onClick={() => {
            setShowTimerModeModal(false);
            setPendingTimer(null);
            setShowCountdownSettings(false);
            setShowPomodoroSettingsTimer(false);
          }}
        >
          <div 
            className="bg-white w-[90%] max-w-sm rounded-3xl p-6 relative animate-scale-in max-h-[85%] overflow-y-auto"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 60px rgba(0, 0, 0, 0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => {
                setShowTimerModeModal(false);
                setPendingTimer(null);
                setShowCountdownSettings(false);
                setShowPomodoroSettingsTimer(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-all"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-black text-[#2D3436] mb-4 text-center">选择计时模式</h3>
            
            {/* 顶部Tab切换 */}
            <div className="flex rounded-2xl bg-gray-100 p-1 mb-4">
              <button
                onClick={() => setTimerMode('countup')}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  timerMode === 'countup' ? 'bg-white text-[#5C7CFA] shadow-sm' : 'text-gray-500'
                }`}
              >
                ⏱️ 正计时
              </button>
              <button
                onClick={() => setTimerMode('countdown')}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  timerMode === 'countdown' ? 'bg-white text-[#009688] shadow-sm' : 'text-gray-500'
                }`}
              >
                ⏳ 倒计时
              </button>
              <button
                onClick={() => setTimerMode('pomodoro')}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  timerMode === 'pomodoro' ? 'bg-white text-[#FF7675] shadow-sm' : 'text-gray-500'
                }`}
              >
                🍅 番茄钟
              </button>
            </div>
            
            {/* 内容区域 */}
            <div className="min-h-[200px]">
              {/* 正计时内容 */}
              {timerMode === 'countup' && (
                <div className="p-4 rounded-2xl" style={{ backgroundColor: '#EEF2FF' }}>
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">⏱️</div>
                    <div className="font-bold text-lg" style={{ color: '#5C7CFA' }}>正计时模式</div>
                    <div className="text-sm text-gray-500 mt-2">从0开始计时，记录实际用时</div>
                  </div>
                  <button
                    onClick={() => confirmStartTimer()}
                    className="w-full py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all"
                    style={{ backgroundColor: '#5C7CFA' }}
                  >
                    开始计时
                  </button>
                </div>
              )}
              
              {/* 倒计时内容 */}
              {timerMode === 'countdown' && (
                <div className="p-4 rounded-2xl" style={{ backgroundColor: '#E0F2F1' }}>
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">⏳</div>
                    <div className="font-bold text-lg" style={{ color: '#009688' }}>倒计时模式</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">倒计时时长</span>
                      <span className="text-lg font-bold text-[#009688]">{timerDuration} 分钟</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="180"
                      value={timerDuration}
                      onChange={(e) => setTimerDuration(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-2 bg-[#B2DFDB] rounded-full appearance-none cursor-pointer accent-[#009688]"
                      style={{
                        background: `linear-gradient(to right, #009688 0%, #009688 ${(timerDuration / 180) * 100}%, #B2DFDB ${(timerDuration / 180) * 100}%, #B2DFDB 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>1分</span>
                      <span>180分</span>
                    </div>
                    <button
                      onClick={() => confirmStartTimer()}
                      className="w-full mt-2 py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all"
                      style={{ backgroundColor: '#009688' }}
                    >
                      开始计时
                    </button>
                  </div>
                </div>
              )}
              
              {/* 番茄钟内容 */}
              {timerMode === 'pomodoro' && (
                <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FFF0F0' }}>
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">🍅</div>
                    <div className="font-bold text-lg" style={{ color: '#FF7675' }}>番茄钟模式</div>
                    <div className="text-xs text-gray-500 mt-1">专注与休息交替进行</div>
                  </div>
                  <div className="space-y-3">
                    {/* 专注时长 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">专注时长</span>
                        <span className="text-sm font-bold text-[#FF7675]">{pomodoroConfig.workDuration} 分钟</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="90"
                        value={pomodoroConfig.workDuration}
                        onChange={(e) => setPomodoroConfig(prev => ({ ...prev, workDuration: Number(e.target.value) }))}
                        className="w-full h-2 bg-red-100 rounded-full appearance-none cursor-pointer accent-[#FF7675]"
                        style={{
                          background: `linear-gradient(to right, #FF7675 0%, #FF7675 ${((pomodoroConfig.workDuration - 5) / 85) * 100}%, #FFCDD2 ${((pomodoroConfig.workDuration - 5) / 85) * 100}%, #FFCDD2 100%)`
                        }}
                      />
                    </div>
                    
                    {/* 休息时长 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">休息时长</span>
                        <span className="text-sm font-bold text-[#FF7675]">{pomodoroConfig.breakDuration} 分钟</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={pomodoroConfig.breakDuration}
                        onChange={(e) => setPomodoroConfig(prev => ({ ...prev, breakDuration: Number(e.target.value) }))}
                        className="w-full h-2 bg-red-100 rounded-full appearance-none cursor-pointer accent-[#FF7675]"
                        style={{
                          background: `linear-gradient(to right, #FF7675 0%, #FF7675 ${((pomodoroConfig.breakDuration - 1) / 29) * 100}%, #FFCDD2 ${((pomodoroConfig.breakDuration - 1) / 29) * 100}%, #FFCDD2 100%)`
                        }}
                      />
                    </div>
                    
                    {/* 轮数 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">几轮后长休息</span>
                        <span className="text-sm font-bold text-[#FF7675]">{pomodoroConfig.rounds} 轮</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={pomodoroConfig.rounds}
                        onChange={(e) => setPomodoroConfig(prev => ({ ...prev, rounds: Number(e.target.value) }))}
                        className="w-full h-2 bg-red-100 rounded-full appearance-none cursor-pointer accent-[#FF7675]"
                        style={{
                          background: `linear-gradient(to right, #FF7675 0%, #FF7675 ${((pomodoroConfig.rounds - 1) / 9) * 100}%, #FFCDD2 ${((pomodoroConfig.rounds - 1) / 9) * 100}%, #FFCDD2 100%)`
                        }}
                      />
                    </div>
                    
                    {/* 长休息时长 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">长休息时长</span>
                        <span className="text-sm font-bold text-[#FF7675]">{pomodoroConfig.longBreakDuration} 分钟</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        value={pomodoroConfig.longBreakDuration}
                        onChange={(e) => setPomodoroConfig(prev => ({ ...prev, longBreakDuration: Number(e.target.value) }))}
                        className="w-full h-2 bg-red-100 rounded-full appearance-none cursor-pointer accent-[#FF7675]"
                        style={{
                          background: `linear-gradient(to right, #FF7675 0%, #FF7675 ${((pomodoroConfig.longBreakDuration - 5) / 55) * 100}%, #FFCDD2 ${((pomodoroConfig.longBreakDuration - 5) / 55) * 100}%, #FFCDD2 100%)`
                        }}
                      />
                    </div>
                    
                    <button
                      onClick={() => confirmStartTimer()}
                      className="w-full mt-2 py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all"
                      style={{ backgroundColor: '#FF7675' }}
                    >
                      开始专注
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 管理分类弹窗 */}
      {showManageCategoryModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white w-[90%] rounded-[2rem] p-6 shadow-2xl animate-scale-in max-h-[85%] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-[#2D2D2D]">管理分类</h3>
              <button 
                onClick={() => setShowManageCategoryModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>
            
            <p className="text-xs text-gray-400 mb-4">拖动调整排序，左滑删除分类</p>
            
            <div ref={categoryListRef} className="flex-1 overflow-y-auto space-y-2 mb-4">
              {categories.map((cat, index) => {
                const catTheme = MACARON_COLORS.categories[cat.id as CategoryId] || {
                  primary: cat.color || '#FF8CA1',
                  light: '#FFF0F3',
                  text: '#D9455F'
                };
                return (
                  <div 
                    key={cat.id}
                    className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 group"
                  >
                    {/* 排序按钮 */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          if (index > 0) {
                            const newCategories = [...categories];
                            [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];
                            setCategories(newCategories);
                          }
                        }}
                        disabled={index === 0}
                        className="w-6 h-6 rounded bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronLeft size={14} className="rotate-90" />
                      </button>
                      <button
                        onClick={() => {
                          if (index < categories.length - 1) {
                            const newCategories = [...categories];
                            [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
                            setCategories(newCategories);
                          }
                        }}
                        disabled={index === categories.length - 1}
                        className="w-6 h-6 rounded bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronLeft size={14} className="-rotate-90" />
                      </button>
                    </div>
                    
                    {/* 颜色标识 */}
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: catTheme.primary }}
                    />
                    
                    {/* 分类名称 */}
                    <span className="flex-1 font-bold text-gray-700">{cat.label}</span>
                    
                    {/* 删除按钮 */}
                    {categories.length > 1 && (
                      <button
                        onClick={() => {
                          if (selectedCategory === cat.id) {
                            const remainingCategories = categories.filter(c => c.id !== cat.id);
                            handleCategoryChange(remainingCategories[0].id as CategoryId);
                          }
                          setCategories(categories.filter(c => c.id !== cat.id));
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 新增分类区域 */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="输入新分类名称..."
                  className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-purple-200"
                />
              </div>
              
              <div className="flex gap-2 mb-4 flex-wrap">
                {['#FF8CA1', '#FFD23F', '#42D4A4', '#B589F6', '#6CB6FF', '#FF6B6B', '#4ECDC4', '#45B7D1'].map(color => (
                  <button
                    key={color}
                    onClick={() => setNewCategoryColor(color)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      newCategoryColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              
              <Button 
                onClick={() => {
                  if (newCategoryName.trim()) {
                    const newCategory: Category = {
                      id: `custom_${Date.now()}`,
                      label: newCategoryName.trim(),
                      color: newCategoryColor,
                      isCustom: true
                    };
                    setCategories([...categories, newCategory]);
                    setNewCategoryName('');
                    setNewCategoryColor('#FF8CA1');
                    // 滚动到底部显示新添加的分类
                    setTimeout(() => {
                      if (categoryListRef.current) {
                        categoryListRef.current.scrollTo({
                          top: categoryListRef.current.scrollHeight,
                          behavior: 'smooth'
                        });
                      }
                    }, 100);
                  }
                }}
                disabled={!newCategoryName.trim()}
                style={{ backgroundColor: newCategoryColor }}
              >
                <Plus size={18} />
                添加分类
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 日记视图
const JournalView = ({ 
  journals, 
  setJournals 
}: { 
  journals: Journal[]; 
  setJournals: (journals: Journal[]) => void;
}) => {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [currentJournal, setCurrentJournal] = useState<CurrentJournal>({
    content: '',
    mood: null,
    images: []
  });
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [editingJournalDate, setEditingJournalDate] = useState<string>(''); // YYYY-MM-DD 格式
  const [previewImages, setPreviewImages] = useState<{ images: string[], index: number } | null>(null);

  const moods = [
    { id: 'happy', emoji: '😊', label: '开心', color: '#FFD23F' },
    { id: 'calm', emoji: '😌', label: '平静', color: '#42D4A4' },
    { id: 'sad', emoji: '😔', label: '难过', color: '#6CB6FF' },
    { id: 'excited', emoji: '🤩', label: '兴奋', color: '#FF9F1C' },
    { id: 'tired', emoji: '😴', label: '疲惫', color: '#E5E5E5' }
  ];

  // 获取今天的日期字符串
  const getTodayStr = () => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  };

  // 将时间戳转换为日期字符串
  const timestampToDateStr = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  };

  // 将日期字符串转换为时间戳（当天开始时间）
  const dateStrToTimestamp = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  };

  const openEditor = (journal: Journal | null = null) => {
    if (journal) {
      setEditingJournalId(journal.id);
      setEditingJournalDate(timestampToDateStr(journal.date));
      setCurrentJournal({
        content: journal.content,
        mood: journal.mood,
        images: journal.images
      });
    } else {
      setEditingJournalId(null);
      setEditingJournalDate(getTodayStr());
      setCurrentJournal({
        content: '',
        mood: null,
        images: []
      });
    }
    setView('editor');
  };

  const saveJournal = () => {
    if (!currentJournal.content.trim()) return;
    
    const journalDate = dateStrToTimestamp(editingJournalDate);
    
    if (editingJournalId) {
      // 编辑现有日记
      setJournals(journals.map(j => 
        j.id === editingJournalId 
          ? { ...j, date: journalDate, mood: currentJournal.mood, content: currentJournal.content, images: currentJournal.images }
          : j
      ));
    } else {
      // 新增日记
      const newJournal = {
        id: Date.now().toString(),
        date: journalDate,
        mood: currentJournal.mood,
        content: currentJournal.content,
        images: currentJournal.images
      };
      setJournals([newJournal, ...journals]);
    }
    
    setEditingJournalId(null);
    setView('list');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86400000);
    
    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    }
  };

  if (view === 'editor') {
    return (
      <div className="flex flex-col h-full relative overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #FFF0F5, #F0FFF0)' }}>
        {/* 背景装饰 */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-pink-100 blur-2xl opacity-50"></div>
        <div className="absolute -left-10 bottom-20 w-32 h-32 rounded-full bg-lime-100 blur-xl opacity-40"></div>
        
        {/* 编辑器头部 */}
        <div className="px-6 pt-8 pb-4 flex justify-between items-center backdrop-blur-sm sticky top-0 z-10">
          <button 
            onClick={() => setView('list')}
            className="text-gray-400 hover:text-gray-600 p-2 -ml-2"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="font-bold text-pink-600">写日记</span>
          <button 
            onClick={saveJournal}
            className="text-pink-500 font-bold p-2 -mr-2"
            disabled={!currentJournal.content.trim()}
          >
            <Check size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 z-10">
          {/* 日期选择 */}
          <div className="mb-6">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
              日期
            </span>
            <div className="relative">
              <input
                type="date"
                value={editingJournalDate}
                onChange={(e) => setEditingJournalDate(e.target.value)}
                max={getTodayStr()}
                className="w-full px-5 py-4 rounded-2xl border-2 border-pink-100 bg-white/80 backdrop-blur-sm text-gray-700 font-bold text-base focus:border-pink-300 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all shadow-sm appearance-none cursor-pointer"
                style={{
                  colorScheme: 'light'
                }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Calendar size={20} className="text-pink-300" />
              </div>
            </div>
            {/* 显示友好的日期格式 */}
            {editingJournalDate && (
              <p className="text-xs text-pink-400 mt-2 ml-1">
                {(() => {
                  const [year, month, day] = editingJournalDate.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                  const today = new Date();
                  const yesterday = new Date(today.getTime() - 86400000);
                  
                  if (date.toDateString() === today.toDateString()) {
                    return `📅 今天 · ${weekdays[date.getDay()]}`;
                  } else if (date.toDateString() === yesterday.toDateString()) {
                    return `📅 昨天 · ${weekdays[date.getDay()]}`;
                  } else {
                    return `📅 ${month}月${day}日 · ${weekdays[date.getDay()]}`;
                  }
                })()}
              </p>
            )}
          </div>

          {/* 心情选择 */}
          <div className="mb-6">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
              当下心情
            </span>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {moods.map(mood => (
                <button
                  key={mood.id}
                  onClick={() => setCurrentJournal({...currentJournal, mood: mood.id})}
                  className={`flex-shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${
                    currentJournal.mood === mood.id 
                      ? 'scale-110 shadow-lg' 
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ 
                    backgroundColor: currentJournal.mood === mood.id ? mood.color + '20' : '#F9FAFB',
                    borderColor: currentJournal.mood === mood.id ? mood.color : 'transparent',
                    borderWidth: '2px'
                  }}
                >
                  <span className="text-2xl mb-1">{mood.emoji}</span>
                  <span className="text-[8px] font-bold text-gray-600">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 文本编辑区 */}
          <div className="mb-4">
            <textarea
              value={currentJournal.content}
              onChange={(e) => setCurrentJournal({...currentJournal, content: e.target.value})}
              placeholder="记录此刻的想法和感受..."
              className="w-full h-48 bg-transparent text-[#2D2D2D] text-base leading-relaxed outline-none resize-none placeholder:text-gray-300"
              autoFocus
            />
          </div>

          {/* 图片区域 */}
          <div className="mb-4">
            <div className="flex gap-2 mb-2 flex-wrap">
              {currentJournal.images.map((img, idx) => (
                <div key={idx} className="relative w-16 h-16 bg-gray-100 rounded-xl overflow-hidden">
                  {img.startsWith('data:') ? (
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Camera size={20} />
                    </div>
                  )}
                  <button 
                    onClick={() => setCurrentJournal({
                      ...currentJournal, 
                      images: currentJournal.images.filter((_, i) => i !== idx)
                    })}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-400 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {currentJournal.images.length < 9 && (
                <>
                  <input
                    type="file"
                    id="journal-image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const imageData = event.target?.result as string;
                          setCurrentJournal({
                            ...currentJournal,
                            images: [...currentJournal.images, imageData]
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                      e.target.value = '';
                    }}
                  />
                  <button 
                    onClick={() => document.getElementById('journal-image-upload')?.click()}
                    className="w-16 h-16 bg-white/60 rounded-xl border-2 border-dashed border-pink-200 flex items-center justify-center text-pink-300 hover:border-pink-400 hover:text-pink-400 transition-all"
                  >
                    <Camera size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #FFF0F5, #F0FFF0)' }}>
      {/* 背景装饰 */}
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-pink-100 blur-2xl opacity-50"></div>
      <div className="absolute -left-10 bottom-40 w-32 h-32 rounded-full bg-lime-100 blur-xl opacity-40"></div>
      
      {/* 头部 */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-end z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-pink-600 mb-2">心情日记</h2>
            <div className="w-2 h-2 rounded-full bg-lime-200 ring-2 ring-pink-200"></div>
          </div>
          <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">
            MOMENTS & THOUGHTS
          </p>
        </div>
        <button 
          onClick={() => openEditor()}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl hover:brightness-110 active:scale-90 transition-all border-b-4 border-pink-500/30"
          style={{ 
            backgroundColor: '#f472b6', 
            boxShadow: '0 10px 20px -5px #f472b666' 
          }}
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>

      {/* 日记列表 */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 z-10">
        {journals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center opacity-60">
              <div className="w-24 h-24 rounded-[2rem] mb-4 flex items-center justify-center bg-pink-100">
                <BookHeart size={40} className="text-pink-400" />
              </div>
              <p className="text-[#2D2D2D] font-bold text-lg">记录美好时光</p>
              <p className="text-[#8A8A8A] text-sm mt-2 px-4">点击右上角开始写下今天的心情</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {(() => {
              // 按日期分组
              const groupedJournals: { [key: string]: Journal[] } = {};
              journals.forEach(journal => {
                const dateKey = new Date(journal.date).toDateString();
                if (!groupedJournals[dateKey]) {
                  groupedJournals[dateKey] = [];
                }
                groupedJournals[dateKey].push(journal);
              });
              
              return Object.entries(groupedJournals).map(([dateKey, dateJournals]) => (
                <div key={dateKey}>
                  {/* 日期标识 */}
                  <div className="flex items-center gap-3 py-3">
                    <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                    <span className="text-sm font-black text-gray-600">
                      {formatDate(dateJournals[0].date)}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-pink-200 to-transparent"></div>
                  </div>
                  
                  {/* 该日期下的日记卡片 */}
                  <div className="space-y-3 ml-1">
                    {dateJournals.map(journal => {
                      const mood = moods.find(m => m.id === journal.mood);
                      const timeStr = new Date(journal.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div 
                          key={journal.id}
                          onClick={() => openEditor(journal)}
                          className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border-2 border-pink-100 relative overflow-hidden"
                        >
                          {/* 左侧装饰条 */}
                          <div className="absolute top-0 left-0 w-2 h-full bg-lime-100"></div>
                          <div className="flex items-start gap-4">
                            {/* 心情图标 */}
                            <div 
                              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: mood ? mood.color + '20' : '#F9FAFB' }}
                            >
                              <span className="text-2xl">{mood?.emoji || '📝'}</span>
                            </div>
                            
                            {/* 内容 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-gray-400">
                                  {timeStr}
                                </span>
                                {mood && (
                                  <span className="text-xs text-gray-400">{mood.label}</span>
                                )}
                              </div>
                              <p className="text-sm text-[#2D2D2D] leading-relaxed line-clamp-3">
                                {journal.content}
                              </p>
                              {journal.images.length > 0 && (
                                <div className="grid grid-cols-3 gap-1 mt-3" style={{ maxWidth: '156px' }}>
                                  {journal.images.slice(0, 9).map((img, idx) => (
                                    <div 
                                      key={idx} 
                                      className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const validImages = journal.images.filter(i => i.startsWith('data:'));
                                        if (validImages.length > 0) {
                                          const actualIndex = validImages.indexOf(img);
                                          setPreviewImages({ images: validImages, index: actualIndex >= 0 ? actualIndex : 0 });
                                        }
                                      }}
                                    >
                                      {img.startsWith('data:') ? (
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Camera size={14} className="text-gray-400" />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* 图片预览弹窗 */}
      {previewImages && (
        <div 
          className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center animate-fade-in"
          onClick={() => setPreviewImages(null)}
        >
          {/* 关闭按钮 */}
          <button 
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
            onClick={() => setPreviewImages(null)}
          >
            <X size={24} />
          </button>
          
          {/* 图片计数 */}
          {previewImages.images.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full">
              <span className="text-white text-sm font-medium">
                {previewImages.index + 1} / {previewImages.images.length}
              </span>
            </div>
          )}
          
          {/* 左箭头 */}
          {previewImages.images.length > 1 && previewImages.index > 0 && (
            <button 
              className="absolute left-4 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImages({ ...previewImages, index: previewImages.index - 1 });
              }}
            >
              <ChevronLeft size={28} />
            </button>
          )}
          
          {/* 图片 */}
          <img 
            src={previewImages.images[previewImages.index]} 
            alt="" 
            className="max-w-[90%] max-h-[85%] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* 右箭头 */}
          {previewImages.images.length > 1 && previewImages.index < previewImages.images.length - 1 && (
            <button 
              className="absolute right-4 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImages({ ...previewImages, index: previewImages.index + 1 });
              }}
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// 复盘视图
const ReviewView = ({ 
  journals, 
  timeRecords, 
  idealTimeAllocation 
}: { 
  journals: Journal[]; 
  timeRecords: TimeRecord[]; 
  idealTimeAllocation: Record<string, number>;
}) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'ai' | 'habits'>('progress');
  const [aiPeriod, setAiPeriod] = useState<'yesterday' | 'today' | 'week' | 'month' | 'history'>('today');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingPeriod, setGeneratingPeriod] = useState<'yesterday' | 'today' | 'week' | 'month' | null>(null); // 记录正在生成的时间段
  const [generatingProgress, setGeneratingProgress] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  
  // 当前进度时间周期
  const [progressPeriod, setProgressPeriod] = useState<'today' | 'week' | 'month'>('today');
  
  // 复盘历史记录
  const [reportHistory, setReportHistory] = useState<Array<{
    id: string;
    period: 'yesterday' | 'today' | 'week' | 'month' | 'history';
    periodLabel: string;
    dateRange: string;
    createdAt: number;
    report: any;
  }>>([]);
  const [viewingHistoryReport, setViewingHistoryReport] = useState<any>(null);

  // 习惯追踪状态
  const [trackedHabits, setTrackedHabits] = useState<Array<{
    id: string;
    name: string;
    icon: string;
    linkedEventNames: string[]; // 关联的事件名称（支持多个）
  }>>(() => {
    const saved = localStorage.getItem('trackedHabits');
    if (saved) {
      const parsed = JSON.parse(saved);
      // 兼容旧数据格式
      return parsed.map((h: any) => ({
        ...h,
        linkedEventNames: h.linkedEventNames || (h.linkedEventName ? [h.linkedEventName] : [])
      }));
    }
    return [
      { id: '1', name: '运动', icon: '🏃', linkedEventNames: ['运动'] },
      { id: '2', name: '阅读', icon: '📚', linkedEventNames: ['阅读'] },
    ];
  });
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<{id: string; name: string; icon: string; linkedEventNames: string[]} | null>(null);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('✨');
  const [newHabitLinkedEvents, setNewHabitLinkedEvents] = useState<string[]>([]);
  
  // 习惯日历当前查看的月份 (每个习惯独立)
  const [habitCalendarMonth, setHabitCalendarMonth] = useState<Record<string, { year: number; month: number }>>({});

  // 保存习惯到localStorage
  useEffect(() => {
    localStorage.setItem('trackedHabits', JSON.stringify(trackedHabits));
  }, [trackedHabits]);

  // 获取所有唯一事件名称（用于关联选择）
  const uniqueEventNames = useMemo(() => {
    const names = new Set<string>();
    timeRecords.forEach(r => names.add(r.name));
    return Array.from(names).sort();
  }, [timeRecords]);

  // 检查某天是否完成了某个习惯（任一关联事件有记录即算完成）
  const isHabitCompletedOnDate = (linkedEventNames: string[], dateStr: string) => {
    return linkedEventNames.some(eventName => 
      timeRecords.some(r => r.date === dateStr && r.name === eventName)
    );
  };

  // 获取指定月份的所有日期
  const getMonthDays = (year: number, month: number) => {
    const days: string[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(`${year}-${month.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`);
    }
    return days;
  };

  // 获取习惯的当前查看月份
  const getHabitMonth = (habitId: string) => {
    if (habitCalendarMonth[habitId]) {
      return habitCalendarMonth[habitId];
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  };

  // 切换习惯日历月份
  const changeHabitMonth = (habitId: string, delta: number) => {
    const current = getHabitMonth(habitId);
    let newMonth = current.month + delta;
    let newYear = current.year;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    
    setHabitCalendarMonth(prev => ({
      ...prev,
      [habitId]: { year: newYear, month: newMonth }
    }));
  };

  // 时间分类配置
  const timeCategories = [
    { id: 'work', label: '工作', color: '#FF8CA1', icon: '💼' },
    { id: 'study', label: '学习', color: '#FFD23F', icon: '📚' },
    { id: 'sleep', label: '睡眠', color: '#6CB6FF', icon: '😴' },
    { id: 'life', label: '生活', color: '#B589F6', icon: '🏠' },
    { id: 'rest', label: '休息', color: '#42D4A4', icon: '☕' },
    { id: 'entertainment', label: '娱乐', color: '#FF9F1C', icon: '🎮' },
    { id: 'health', label: '健康', color: '#22d3ee', icon: '🏃' },
    { id: 'hobby', label: '兴趣', color: '#f472b6', icon: '🎨' }
  ];

  // 心情映射
  const moodMap: Record<string, string> = {
    'happy': '😊 开心',
    'calm': '😌 平静',
    'sad': '😔 难过',
    'excited': '🤩 兴奋',
    'tired': '😴 疲惫'
  };

  // 计算实际时间分布
  const calculateActualTimeDistribution = (period: string) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    
    let startDateStr = '';
    
    switch (period) {
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        startDateStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;
        break;
      }
      case 'today':
        startDateStr = todayStr;
        break;
      case 'week': {
        // 获取本周一
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        startDateStr = `${monday.getFullYear()}-${(monday.getMonth() + 1).toString().padStart(2, '0')}-${monday.getDate().toString().padStart(2, '0')}`;
        break;
      }
      case 'month': {
        // 获取本月第一天
        startDateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
        break;
      }
      default:
        startDateStr = todayStr;
    }

    const filteredRecords = timeRecords.filter(r => {
      // 使用字符串比较日期
      return r.date >= startDateStr && r.date <= todayStr;
    });

    // 按分类统计时间（小时）
    const distribution: Record<string, number> = {};
    filteredRecords.forEach(record => {
      const start = record.startTime.split(':').map(Number);
      const end = record.endTime.split(':').map(Number);
      
      // 计算分钟数
      let minutes = end[0] * 60 + end[1] - start[0] * 60 - start[1];
      
      // 处理跨天情况（结束时间小于开始时间）
      if (minutes < 0) {
        minutes += 24 * 60;
      }
      
      // 如果开始和结束时间相同，至少算1分钟
      if (minutes === 0) {
        minutes = 1;
      }
      
      const hours = minutes / 60;
      const category = record.categoryId || 'uncategorized';
      distribution[category] = (distribution[category] || 0) + hours;
    });

    return distribution;
  };

  // 获取时间段内的日记
  const getJournalsInPeriod = (period: string) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    
    let startDateStr = '';
    
    switch (period) {
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        startDateStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;
        break;
      }
      case 'today':
        startDateStr = todayStr;
        break;
      case 'week': {
        // 获取本周一
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        startDateStr = `${monday.getFullYear()}-${(monday.getMonth() + 1).toString().padStart(2, '0')}-${monday.getDate().toString().padStart(2, '0')}`;
        break;
      }
      case 'month': {
        // 获取本月第一天
        startDateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
        break;
      }
      default:
        startDateStr = todayStr;
    }

    return journals.filter(j => {
      const journalDate = new Date(j.date);
      const journalDateStr = `${journalDate.getFullYear()}-${(journalDate.getMonth() + 1).toString().padStart(2, '0')}-${journalDate.getDate().toString().padStart(2, '0')}`;
      return journalDateStr >= startDateStr && journalDateStr <= todayStr;
    });
  };

  // 生成AI复盘报告
  const generateReport = async () => {
    setIsGenerating(true);
    setGeneratingPeriod(aiPeriod as 'yesterday' | 'today' | 'week' | 'month');
    setGeneratingProgress('正在收集数据...');
    
    // 获取数据
    const actualDistribution = calculateActualTimeDistribution(aiPeriod);
    const periodJournals = getJournalsInPeriod(aiPeriod);
    const periodLabels: Record<string, string> = { yesterday: '昨日', today: '今日', week: '本周', month: '本月', history: '历史' };
    const periodDays: Record<string, number> = { yesterday: 1, today: 1, week: 7, month: 30, history: 365 };
    
    setGeneratingProgress('正在分析时间分布...');
    
    // 准备数据
    const days = periodDays[aiPeriod];
    const totalActualHours = Object.values(actualDistribution).reduce((sum, h) => sum + h, 0);
    
    // 分析日记情绪
    const moodCounts: Record<string, number> = {};
    periodJournals.forEach(j => {
      if (j.mood) {
        moodCounts[j.mood] = (moodCounts[j.mood] || 0) + 1;
      }
    });
    
    setGeneratingProgress('正在计算理想与实际差距...');
    
    // 计算理想与实际的差距
    const gaps: Array<{category: string, ideal: number, actual: number, diff: number}> = [];
    timeCategories.forEach(cat => {
      const idealHours = (idealTimeAllocation[cat.id] || 0) * days;
      const actualHours = actualDistribution[cat.id] || 0;
      gaps.push({
        category: cat.label,
        ideal: idealHours,
        actual: actualHours,
        diff: actualHours - idealHours
      });
    });
    
    setGeneratingProgress('正在构建AI提示词...');
    
    // 构建AI提示词
    const prompt = `# Role
你是一位**客观、敏锐的数据生活策略师**。你的特长是透过冰冷的时间数据，洞察用户当下的能量状态和长期趋势。你的风格**简洁有力、中肯深入**，拒绝泛泛而谈的鸡汤，也不使用危言耸听的警告。

# Input Data
用户的时间记录数据 + 日记复盘内容

## 用户数据
- 时间周期：${periodLabels[aiPeriod]}（${days}天）
- 日记数量：${periodJournals.length}篇
- 时间记录总时长：${totalActualHours.toFixed(1)}小时

## 时间分配情况（实际 vs 理想）
${gaps.map(g => `- ${g.category}：实际${g.actual.toFixed(1)}h，理想${g.ideal.toFixed(1)}h，差距${g.diff > 0 ? '+' : ''}${g.diff.toFixed(1)}h`).join('\n')}

## 情绪记录
${Object.entries(moodCounts).length > 0 ? Object.entries(moodCounts).map(([mood, count]) => `- ${moodMap[mood] || mood}：${count}次`).join('\n') : '暂无情绪记录'}

## 日记内容摘要
${periodJournals.slice(0, 5).map(j => `- ${j.content.slice(0, 100)}${j.content.length > 100 ? '...' : ''}`).join('\n') || '暂无日记内容'}

# Analysis Goals & Constraints (必须遵守)
1.  **透支诊断：** 必须分析"产出"与"休息"的比例，判断是否存在"借用未来能量"的行为。
2.  **长期推演：** 基于当前模式，描绘3个月后的状态。**重点描述"坏的变化"**（如创造力枯竭、情绪波动），作为客观预警，**语气要冷静客观，点到为止，不要制造恐慌**。
3.  **筛选信号：** 明确指出哪些行为是"高杠杆"（坚持有益），哪些是"负资产"（坚持有害）。
4.  **排版要求：**
* 分为 **📊 Summary** 和 **💡 Advice** 两个大板块。
* 使用自然分段，避免全是零散的列点。
* **重点内容必须加粗**。
* 适当使用emoji作为视觉引导，但不要滥用。

# Output Structure (严格按照此格式输出JSON)
请以JSON格式返回复盘报告，格式如下：
{
  "summary": {
    "energyAudit": "能量审计分析：用一段话直接分析数据是否显示在透支，结合日记情绪与客观记录的矛盾，指出这种状态是可持续的还是虚假的繁荣",
    "positiveSignal": "📈 坚持下去有益处：指出数据中体现的一个核心亮点或好习惯",
    "negativeSignal": "📉 坚持下去有坏处：指出一个正在悄悄侵蚀效率或健康的隐患"
  },
  "advice": {
    "threeMonthWarning": "三个月后的预警：如果维持现状不变，三个月后会发生什么负面变化。侧重于边际效应递减、精力崩塌或热情耗尽。语气保持中肯评价，客观描述后果",
    "protections": [
      "🛡️ 守护事项1：基于缺口，最不能牺牲的东西",
      "🛡️ 守护事项2",
      "🛡️ 守护事项3"
    ],
    "adjustment": "时间分布调整建议：针对记录缺陷，给出具体的时间配比建议。不要只说多休息，要说将工作切块，强制插入15分钟留白等具体操作"
  }
}

要求：
1. 语气简洁有力、中肯深入，拒绝泛泛而谈的鸡汤
2. 分析要有深度，透过数据洞察能量状态
3. 建议要具体可行，不要空洞
4. 使用**加粗**标记重点内容
5. 只返回JSON，不要其他内容`;

    setGeneratingProgress('正在调用AI分析...');

    try {
      // 调用DeepSeek API（通过代理）
      const response = await fetch('/api/deepseek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-d1fdb210d0424ffdbad83f1ebe4e283b'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一位客观、敏锐的数据生活策略师。你的特长是透过冰冷的时间数据，洞察用户当下的能量状态和长期趋势。你的风格简洁有力、中肯深入，拒绝泛泛而谈的鸡汤，也不使用危言耸听的警告。请以JSON格式返回分析报告。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 3000
        })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      setGeneratingProgress('正在解析AI响应...');
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      // 解析AI返回的JSON
      let report;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          report = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('无法解析AI响应');
        }
      } catch (parseError) {
        console.error('解析AI响应失败:', parseError);
        throw new Error('AI响应格式错误，请重试');
      }
      
      // 添加period字段
      report.period = periodLabels[aiPeriod];
      
      // 生成日期范围描述
      const now = new Date();
      let dateRange = '';
      if (aiPeriod === 'yesterday') {
        const yesterday = new Date(now.getTime() - 86400000);
        dateRange = `${yesterday.getMonth() + 1}月${yesterday.getDate()}日`;
      } else if (aiPeriod === 'today') {
        dateRange = `${now.getMonth() + 1}月${now.getDate()}日`;
      } else if (aiPeriod === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        dateRange = `${weekAgo.getMonth() + 1}月${weekAgo.getDate()}日 - ${now.getMonth() + 1}月${now.getDate()}日`;
      } else {
        const monthAgo = new Date(now.getTime() - 30 * 86400000);
        dateRange = `${monthAgo.getMonth() + 1}月${monthAgo.getDate()}日 - ${now.getMonth() + 1}月${now.getDate()}日`;
      }
      
      // 保存到历史记录
      const historyEntry = {
        id: `${aiPeriod}_${now.toISOString().split('T')[0]}`,
        period: aiPeriod,
        periodLabel: periodLabels[aiPeriod],
        dateRange: dateRange,
        createdAt: now.getTime(),
        report: report
      };
      
      setReportHistory(prev => {
        const existingIndex = prev.findIndex(h => h.period === aiPeriod);
        if (existingIndex >= 0) {
          const newHistory = [...prev];
          newHistory[existingIndex] = historyEntry;
          return newHistory;
        } else {
          return [historyEntry, ...prev];
        }
      });
      
      setReportData(report);
      setIsGenerating(false);
      setGeneratingPeriod(null);
      
    } catch (error) {
      console.error('生成复盘报告失败:', error);
      setIsGenerating(false);
      setGeneratingPeriod(null);
      const errorMessage = error instanceof Error ? error.message : 'AI复盘生成失败，请检查网络连接后重试';
      alert(errorMessage);
    }
  };
  
  // 计算真实时间分布数据
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // 根据时间周期获取记录
  const getRecordsByPeriod = (period: 'today' | 'week' | 'month') => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    
    if (period === 'today') {
      return timeRecords.filter(r => r.date === todayStr);
    } else if (period === 'week') {
      // 获取本周一的日期
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);
      
      return timeRecords.filter(r => {
        const recordDate = new Date(r.date + 'T00:00:00');
        return recordDate >= monday && recordDate <= today;
      });
    } else {
      // 获取本月第一天
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      return timeRecords.filter(r => {
        const recordDate = new Date(r.date + 'T00:00:00');
        return recordDate >= firstDayOfMonth && recordDate <= today;
      });
    }
  };
  
  // 计算分类时间分布
  const calculateCategoryDistribution = () => {
    const periodRecords = getRecordsByPeriod(progressPeriod);
    const distribution: Record<string, { totalMinutes: number; records: Array<{ name: string; minutes: number }> }> = {};
    
    // 初始化所有预定义分类
    timeCategories.forEach(cat => {
      distribution[cat.id] = { totalMinutes: 0, records: [] };
    });
    distribution['uncategorized'] = { totalMinutes: 0, records: [] };
    
    periodRecords.forEach(record => {
      const start = record.startTime.split(':').map(Number);
      const end = record.endTime.split(':').map(Number);
      let minutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
      
      // 如果结束时间小于开始时间，可能是跨天，暂时设为1分钟
      // 如果开始和结束相同，也设为1分钟（表示有这个活动记录）
      if (minutes <= 0) {
        minutes = 1;
      }
      
      const categoryId = record.categoryId || 'uncategorized';
      if (!distribution[categoryId]) {
        // 动态添加未知分类
        distribution[categoryId] = { totalMinutes: 0, records: [] };
      }
      distribution[categoryId].totalMinutes += minutes;
      distribution[categoryId].records.push({ name: record.name, minutes });
    });
    
    return distribution;
  };
  
  const categoryDistribution = calculateCategoryDistribution();
  const totalMinutes = Object.values(categoryDistribution).reduce((sum, cat) => sum + cat.totalMinutes, 0);
  
  // 生成饼图数据 - 包含所有有数据的分类
  const pieData: Array<{
    id: string;
    label: string;
    color: string;
    icon: string;
    minutes: number;
    percentage: number;
    records: Array<{ name: string; minutes: number }>;
  }> = [];
  
  // 先添加预定义分类
  timeCategories.forEach(cat => {
    if (categoryDistribution[cat.id]?.totalMinutes > 0) {
      pieData.push({
        id: cat.id,
        label: cat.label,
        color: cat.color,
        icon: cat.icon,
        minutes: categoryDistribution[cat.id].totalMinutes,
        percentage: totalMinutes > 0 ? (categoryDistribution[cat.id].totalMinutes / totalMinutes) * 100 : 0,
        records: categoryDistribution[cat.id].records
      });
    }
  });
  
  // 添加待分类
  if (categoryDistribution['uncategorized']?.totalMinutes > 0) {
    pieData.push({
      id: 'uncategorized',
      label: '待分类',
      color: '#9ca3af',
      icon: '📁',
      minutes: categoryDistribution['uncategorized'].totalMinutes,
      percentage: (categoryDistribution['uncategorized'].totalMinutes / totalMinutes) * 100,
      records: categoryDistribution['uncategorized'].records
    });
  }
  
  // 添加其他自定义分类（不在预定义列表中的）
  const predefinedIds = [...timeCategories.map(c => c.id), 'uncategorized'];
  const customColors = ['#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#EF4444'];
  let colorIndex = 0;
  
  Object.keys(categoryDistribution).forEach(catId => {
    if (!predefinedIds.includes(catId) && categoryDistribution[catId].totalMinutes > 0) {
      pieData.push({
        id: catId,
        label: catId.replace('custom_', '自定义'),
        color: customColors[colorIndex % customColors.length],
        icon: '📌',
        minutes: categoryDistribution[catId].totalMinutes,
        percentage: (categoryDistribution[catId].totalMinutes / totalMinutes) * 100,
        records: categoryDistribution[catId].records
      });
      colorIndex++;
    }
  });
  
  // 计算饼图路径 - 使用圆弧描边实现圆角效果
  const generatePieSlices = () => {
    if (pieData.length === 0) return [];
    
    let currentAngle = -90; // 从顶部开始
    const slices: Array<{ 
      path: string; 
      color: string; 
      id: string;
      startAngle: number;
      endAngle: number;
    }> = [];
    const cx = 100, cy = 100, r = 68; // 圆弧的中心半径
    
    pieData.forEach(item => {
      const angle = (item.percentage / 100) * 360;
      // 为每段留出小间隙以显示圆角效果
      const gap = pieData.length > 1 ? 2 : 0;
      const startAngle = currentAngle + gap / 2;
      const endAngle = currentAngle + angle - gap / 2;
      
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      
      const largeArc = angle > 180 ? 1 : 0;
      
      // 使用圆弧路径而不是扇形
      const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
      slices.push({ 
        path, 
        color: item.color, 
        id: item.id,
        startAngle,
        endAngle
      });
      
      currentAngle += angle;
    });
    
    return slices;
  };

  const tabs = [
    { id: 'progress' as const, label: '当前进度' },
    { id: 'ai' as const, label: 'AI复盘' },
    { id: 'habits' as const, label: '习惯追踪' },
  ];

  const aiPeriods = [
    { id: 'yesterday' as const, label: '昨日' },
    { id: 'today' as const, label: '今日' },
    { id: 'week' as const, label: '本周' },
    { id: 'month' as const, label: '本月' },
    { id: 'history' as const, label: '历史' },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #F0F8FF, #FFF0F5)' }}>
      {/* 背景装饰 */}
      <div className="absolute -right-10 top-10 w-40 h-40 rounded-full bg-sky-100 blur-2xl opacity-50"></div>
      <div className="absolute -left-10 bottom-40 w-32 h-32 rounded-full bg-rose-100 blur-xl opacity-40"></div>
      
      {/* 头部 */}
      <div className="px-6 pt-4 pb-2 z-10">
        {/* 主Tab切换 */}
        <div className="flex rounded-2xl p-1" style={{ backgroundColor: '#F7F9FC' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'text-white' 
                  : ''
              }`}
              style={activeTab === tab.id 
                ? { backgroundColor: '#89CFF0', boxShadow: '0 4px 12px rgba(137, 207, 240, 0.4)' }
                : { backgroundColor: 'transparent', color: '#BDBDBD' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 z-10">
        {/* 当前进度 */}
        {activeTab === 'progress' && (
          <div className="pt-4">
            {/* 时间周期切换 - 下划线样式 */}
            <div className="flex mb-4">
              {[
                { id: 'today', label: '今日' },
                { id: 'week', label: '本周' },
                { id: 'month', label: '本月' }
              ].map(period => (
                <button
                  key={period.id}
                  onClick={() => {
                    setProgressPeriod(period.id as 'today' | 'week' | 'month');
                    setSelectedCategory(null);
                  }}
                  className="flex-1 py-2 text-xs font-bold transition-all relative"
                  style={{ 
                    color: progressPeriod === period.id ? '#89CFF0' : '#BDBDBD'
                  }}
                >
                  {period.label}
                  {progressPeriod === period.id && (
                    <div 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                      style={{ backgroundColor: '#89CFF0' }}
                    />
                  )}
                </button>
              ))}
            </div>
            
            {/* 时间分布饼图 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-5 shadow-sm mb-6 border-2 border-sky-100">
              <h4 className="font-black text-sky-700 mb-4">
                {progressPeriod === 'today' ? '今日' : progressPeriod === 'week' ? '本周' : '本月'}时间分布
              </h4>
              
              {totalMinutes === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <Clock size={32} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm">
                    {progressPeriod === 'today' ? '今日' : progressPeriod === 'week' ? '本周' : '本月'}暂无时间记录
                  </p>
                  <p className="text-gray-300 text-xs mt-1">使用计时器或导入日历数据后显示</p>
                </div>
              ) : selectedCategory ? (
                // 分类详情视图
                <div>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center gap-2 text-sky-600 font-bold mb-4"
                  >
                    <ChevronLeft size={18} />
                    返回总览
                  </button>
                  
                  {(() => {
                    const catData = pieData.find(p => p.id === selectedCategory);
                    if (!catData) return null;
                    
                    // 合并同名记录
                    const mergedRecords: Array<{ name: string; minutes: number }> = [];
                    catData.records.forEach(record => {
                      const existing = mergedRecords.find(r => r.name === record.name);
                      if (existing) {
                        existing.minutes += record.minutes;
                      } else {
                        mergedRecords.push({ ...record });
                      }
                    });
                    // 按时间降序排序
                    mergedRecords.sort((a, b) => b.minutes - a.minutes);
                    
                    return (
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                            style={{ backgroundColor: catData.color + '20' }}
                          >
                            {catData.icon}
                          </div>
                          <div>
                            <h5 className="font-bold text-gray-700">{catData.label}</h5>
                            <p className="text-sm text-gray-500">
                              共 {Math.floor(catData.minutes / 60)}h {catData.minutes % 60}m · {catData.percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {mergedRecords.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">该分类下暂无记录</p>
                          ) : (
                            mergedRecords.map((record, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                              >
                                <span className="text-sm font-medium text-gray-700">{record.name}</span>
                                <span className="text-sm font-bold" style={{ color: catData.color }}>
                                  {record.minutes >= 60 
                                    ? `${Math.floor(record.minutes / 60)}h ${record.minutes % 60}m`
                                    : `${record.minutes}m`
                                  }
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                // 饼图总览视图
                <div>
                  {/* 饼图 */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <svg width="200" height="200" viewBox="0 0 200 200">
                        {generatePieSlices().map((slice, idx) => (
                          <path
                            key={idx}
                            d={slice.path}
                            fill="none"
                            stroke={slice.color}
                            strokeWidth="24"
                            strokeLinecap="round"
                            className="hover:opacity-80 cursor-pointer"
                            onClick={() => setSelectedCategory(slice.id)}
                          />
                        ))}
                        {/* 中心圆 */}
                        <circle cx="100" cy="100" r="48" fill="white" />
                        <text x="100" y="95" textAnchor="middle" className="text-2xl font-black fill-gray-700">
                          {Math.floor(totalMinutes / 60)}h{totalMinutes % 60 > 0 ? ` ${totalMinutes % 60}m` : ''}
                        </text>
                        <text x="100" y="115" textAnchor="middle" className="text-xs fill-gray-400">
                          总时长
                        </text>
                      </svg>
                    </div>
                  </div>
                  
                  {/* 图例 */}
                  <div className="space-y-3">
                    {[...pieData].sort((a, b) => b.minutes - a.minutes).map(item => {
                      // 计算理想时间（根据时间周期）
                      const daysInPeriod = progressPeriod === 'today' ? 1 : progressPeriod === 'week' ? 7 : 30;
                      const idealHoursPerDay = idealTimeAllocation[item.id] || 0;
                      const idealMinutes = idealHoursPerDay * 60 * daysInPeriod;
                      const progressPercent = idealMinutes > 0 ? Math.min((item.minutes / idealMinutes) * 100, 100) : 0;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedCategory(item.id)}
                          className="w-full p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all text-left"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-sm">{item.icon}</span>
                              <span className="text-sm font-bold text-gray-700">{item.label}</span>
                              <span className="text-xs text-gray-400 ml-1">{item.percentage.toFixed(0)}%</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {item.minutes >= 60 
                                ? `${Math.floor(item.minutes / 60)}h ${item.minutes % 60}m`
                                : `${item.minutes}m`
                              }
                              {idealMinutes > 0 && (
                                <span className="text-gray-400">
                                  {' / '}
                                  {idealMinutes >= 60 
                                    ? `${Math.floor(idealMinutes / 60)}h${idealMinutes % 60 > 0 ? ` ${idealMinutes % 60}m` : ''}`
                                    : `${idealMinutes}m`
                                  }
                                </span>
                              )}
                            </span>
                            <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                          </div>
                          {/* 进度条 */}
                          {idealMinutes > 0 && (
                            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F0F4F8' }}>
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${progressPercent}%`,
                                  backgroundColor: item.color
                                }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI复盘 */}
        {activeTab === 'ai' && (
          <div className="pt-4">
            {/* 时间段选择 - 下划线样式 */}
            <div className="flex mb-6">
              {aiPeriods.map(period => (
                <button
                  key={period.id}
                  onClick={() => { setAiPeriod(period.id); if (period.id !== 'history') setReportData(null); setViewingHistoryReport(null); }}
                  className="flex-1 py-2 text-xs font-bold transition-all relative"
                  style={{ 
                    color: aiPeriod === period.id ? '#89CFF0' : '#BDBDBD'
                  }}
                >
                  {period.label}
                  {aiPeriod === period.id && (
                    <div 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                      style={{ backgroundColor: '#89CFF0' }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* 复盘历史视图 */}
            {aiPeriod === 'history' ? (
              <div>
                {viewingHistoryReport ? (
                  // 查看历史报告详情
                  <div className="space-y-4">
                    <button
                      onClick={() => setViewingHistoryReport(null)}
                      className="flex items-center gap-2 text-sky-600 font-bold mb-4"
                    >
                      <ChevronLeft size={20} />
                      返回历史列表
                    </button>
                    
                    {/* 📊 Summary 深度复盘 */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                          <Lightbulb size={18} className="text-purple-500" />
                        </div>
                        <h4 className="font-black text-gray-800 text-lg">📊 Summary 深度复盘</h4>
                      </div>
                      
                      {/* 能量审计 */}
                      <div className="mb-4">
                        <h5 className="font-bold text-gray-700 mb-2">1. 能量审计 (Energy Audit)</h5>
                        <p className="text-sm text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ 
                          __html: (viewingHistoryReport.summary?.energyAudit || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-800">$1</strong>') 
                        }} />
                      </div>
                      
                      {/* 行为信号 */}
                      <div>
                        <h5 className="font-bold text-gray-700 mb-2">2. 行为信号 (Behavioral Signals)</h5>
                        <div className="space-y-2">
                          <div className="bg-green-50 rounded-xl p-3">
                            <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                              __html: (viewingHistoryReport.summary?.positiveSignal || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-green-700">$1</strong>') 
                            }} />
                          </div>
                          <div className="bg-orange-50 rounded-xl p-3">
                            <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                              __html: (viewingHistoryReport.summary?.negativeSignal || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-orange-700">$1</strong>') 
                            }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 💡 Advice 未来指引 */}
                    <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl p-5 border-2 border-sky-100">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center">
                          <Lightbulb size={18} className="text-sky-500" />
                        </div>
                        <h4 className="font-black text-sky-800 text-lg">💡 Advice 未来指引</h4>
                      </div>
                      
                      {/* 三个月后的预警 */}
                      <div className="mb-5">
                        <h5 className="font-bold text-gray-700 mb-2">1. 三个月后的预警 (The 3-Month Trajectory)</h5>
                        <div className="bg-white/60 rounded-xl p-3">
                          <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                            __html: (viewingHistoryReport.advice?.threeMonthWarning || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-700">$1</strong>') 
                          }} />
                        </div>
                      </div>

                      {/* 当前最需守护的三件事 */}
                      <div className="mb-5">
                        <h5 className="font-bold text-gray-700 mb-2">2. 当前最需守护的三件事 (Top 3 Protections)</h5>
                        <div className="space-y-2">
                          {(viewingHistoryReport.advice?.protections || []).map((item: string, i: number) => (
                            <div key={i} className="bg-white/60 rounded-xl p-3">
                              <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                                __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-700">$1</strong>') 
                              }} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 时间分布调整建议 */}
                      <div>
                        <h5 className="font-bold text-gray-700 mb-2">3. 时间分布调整建议 (Adjustment)</h5>
                        <div className="bg-white/60 rounded-xl p-3">
                          <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                            __html: (viewingHistoryReport.advice?.adjustment || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-700">$1</strong>') 
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // 历史列表
                  <div>
                    {reportHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gray-100 rounded-[2rem] mx-auto mb-4 flex items-center justify-center">
                          <Clock size={40} className="text-gray-300" />
                        </div>
                        <p className="text-gray-400 text-sm mb-2">暂无复盘历史</p>
                        <p className="text-gray-300 text-xs">生成AI复盘后会自动保存到这里</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reportHistory.sort((a, b) => b.createdAt - a.createdAt).map(history => (
                          <button
                            key={history.id}
                            onClick={() => setViewingHistoryReport(history.report)}
                            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-sky-200 hover:shadow-md transition-all text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                  history.period === 'today' ? 'bg-green-100' :
                                  history.period === 'yesterday' ? 'bg-blue-100' :
                                  history.period === 'week' ? 'bg-purple-100' : 'bg-orange-100'
                                }`}>
                                  <span className="text-2xl">
                                    {history.period === 'today' ? '📅' :
                                     history.period === 'yesterday' ? '📆' :
                                     history.period === 'week' ? '📊' : '📈'}
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-700">{history.periodLabel}复盘</h4>
                                  <p className="text-xs text-gray-400">{history.dateRange}</p>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-gray-400" />
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-50">
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {new Date(history.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (isGenerating && generatingPeriod === aiPeriod) ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-black text-sky-600 mb-3">{generatingProgress}</h3>
                <div className="flex justify-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-sky-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            ) : reportData ? (
              <div className="space-y-4">
                {/* 报告头部 - 显示时间周期和重新生成按钮 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {reportData.period || aiPeriods.find(p => p.id === aiPeriod)?.label}复盘报告
                    </span>
                  </div>
                  <button
                    onClick={generateReport}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 transition-all"
                  >
                    <RefreshCw size={12} />
                    重新生成
                  </button>
                </div>

                {/* ===== 📊 Summary 深度复盘 ===== */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Lightbulb size={18} className="text-purple-500" />
                    </div>
                    <h4 className="font-black text-gray-800 text-lg">📊 Summary 深度复盘</h4>
                  </div>
                  
                  {/* 能量审计 */}
                  <div className="mb-4">
                    <h5 className="font-bold text-gray-700 mb-2">1. 能量审计 (Energy Audit)</h5>
                    <p className="text-sm text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ 
                      __html: (reportData.summary?.energyAudit || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-800">$1</strong>') 
                    }} />
                  </div>
                  
                  {/* 行为信号 */}
                  <div>
                    <h5 className="font-bold text-gray-700 mb-2">2. 行为信号 (Behavioral Signals)</h5>
                    <div className="space-y-2">
                      <div className="bg-green-50 rounded-xl p-3">
                        <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                          __html: (reportData.summary?.positiveSignal || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-green-700">$1</strong>') 
                        }} />
                      </div>
                      <div className="bg-orange-50 rounded-xl p-3">
                        <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                          __html: (reportData.summary?.negativeSignal || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-orange-700">$1</strong>') 
                        }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===== 💡 Advice 未来指引 ===== */}
                <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl p-5 border-2 border-sky-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center">
                      <Lightbulb size={18} className="text-sky-500" />
                    </div>
                    <h4 className="font-black text-sky-800 text-lg">💡 Advice 未来指引</h4>
                  </div>

                  {/* 三个月后的预警 */}
                  <div className="mb-5">
                    <h5 className="font-bold text-gray-700 mb-2">1. 三个月后的预警 (The 3-Month Trajectory)</h5>
                    <div className="bg-white/60 rounded-xl p-3">
                      <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                        __html: (reportData.advice?.threeMonthWarning || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-700">$1</strong>') 
                      }} />
                    </div>
                  </div>

                  {/* 当前最需守护的三件事 */}
                  <div className="mb-5">
                    <h5 className="font-bold text-gray-700 mb-2">2. 当前最需守护的三件事 (Top 3 Protections)</h5>
                    <div className="space-y-2">
                      {(reportData.advice?.protections || []).map((item: string, i: number) => (
                        <div key={i} className="bg-white/60 rounded-xl p-3">
                          <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                            __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-700">$1</strong>') 
                          }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 时间分布调整建议 */}
                  <div>
                    <h5 className="font-bold text-gray-700 mb-2">3. 时间分布调整建议 (Adjustment)</h5>
                    <div className="bg-white/60 rounded-xl p-3">
                      <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                        __html: (reportData.advice?.adjustment || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-700">$1</strong>') 
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm mb-6">点击下方按钮生成{aiPeriods.find(p => p.id === aiPeriod)?.label}的AI复盘报告</p>
                <Button 
                  onClick={generateReport} 
                  style={{ 
                    background: 'linear-gradient(90deg, #89CFF0 0%, #FFB6C1 100%)',
                    boxShadow: '0 8px 25px rgba(137, 207, 240, 0.4), 0 8px 25px rgba(255, 182, 193, 0.3)',
                    color: '#FFFFFF'
                  }}
                >
                  <Sparkles size={20} />
                  生成 AI 复盘报告
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 习惯追踪 */}
        {activeTab === 'habits' && (
          <div className="pt-4 space-y-4">
            {trackedHabits.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-[2rem] mx-auto mb-4 flex items-center justify-center">
                  <Target size={40} className="text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm mb-2">暂无追踪的习惯</p>
                <p className="text-gray-300 text-xs">添加习惯并关联数据源开始追踪</p>
              </div>
            ) : (
              trackedHabits.map(habit => {
                const currentMonth = getHabitMonth(habit.id);
                const monthDays = getMonthDays(currentMonth.year, currentMonth.month);
                const completedDays = monthDays.filter(d => isHabitCompletedOnDate(habit.linkedEventNames, d)).length;
                const totalDays = monthDays.length;
                const now = new Date();
                const isCurrentMonth = currentMonth.year === now.getFullYear() && currentMonth.month === now.getMonth() + 1;
                const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
                
                // 获取该月第一天是星期几 (0=周日, 1=周一, ...)
                const firstDayOfWeek = new Date(currentMonth.year, currentMonth.month - 1, 1).getDay();
                // 转换为周一开始 (0=周一, 6=周日)
                const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
                
                return (
                  <div key={habit.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    {/* 习惯头部 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-xl">
                          {habit.icon}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-700">{habit.name}</h4>
                          <p className="text-xs text-gray-400 truncate max-w-[150px]">
                            关联: {habit.linkedEventNames.length > 0 ? habit.linkedEventNames.join('、') : '未关联'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingHabit(habit);
                            setNewHabitName(habit.name);
                            setNewHabitIcon(habit.icon);
                            setNewHabitLinkedEvents(habit.linkedEventNames);
                            setShowAddHabitModal(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('确定删除这个习惯吗？')) {
                              setTrackedHabits(prev => prev.filter(h => h.id !== habit.id));
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {/* 月份导航 */}
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => changeHabitMonth(habit.id, -1)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="text-center">
                        <span className="text-sm font-bold text-gray-700">
                          {currentMonth.year}年{monthNames[currentMonth.month - 1]}
                        </span>
                        <span className="text-xs text-sky-500 ml-2">
                          {completedDays}/{totalDays}天
                        </span>
                      </div>
                      <button
                        onClick={() => changeHabitMonth(habit.id, 1)}
                        className={`p-1.5 rounded-lg hover:bg-gray-100 ${isCurrentMonth ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400'}`}
                        disabled={isCurrentMonth}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    
                    {/* 星期标题 */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {['一', '二', '三', '四', '五', '六', '日'].map(day => (
                        <div key={day} className="text-center text-[10px] text-gray-400 font-medium">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* 日历网格 */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* 空白占位 */}
                      {Array.from({ length: startOffset }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="aspect-square" />
                      ))}
                      
                      {/* 日期格子 */}
                      {monthDays.map((dateStr, idx) => {
                        const completed = isHabitCompletedOnDate(habit.linkedEventNames, dateStr);
                        const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
                        const isToday = dateStr === todayStr;
                        const isFuture = new Date(dateStr) > now;
                        const day = parseInt(dateStr.split('-')[2]);
                        
                        return (
                          <div
                            key={idx}
                            className={`aspect-square rounded-lg flex items-center justify-center text-[10px] relative ${
                              isFuture 
                                ? 'bg-gray-50/50 text-gray-200'
                                : completed 
                                  ? 'bg-green-100 text-green-600' 
                                  : 'bg-gray-50 text-gray-400'
                            } ${isToday ? 'ring-2 ring-sky-300' : ''}`}
                            title={dateStr}
                          >
                            {completed && !isFuture ? (
                              <Check size={12} className="text-green-500" />
                            ) : (
                              <span>{day}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* 日历图例 */}
                    <div className="flex items-center justify-end gap-3 mt-2 text-[10px] text-gray-400">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-100 flex items-center justify-center">
                          <Check size={8} className="text-green-500" />
                        </div>
                        <span>已完成</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-gray-50"></div>
                        <span>未完成</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            {/* 添加习惯按钮 */}
            <button 
              onClick={() => {
                setEditingHabit(null);
                setNewHabitName('');
                setNewHabitIcon('✨');
                setNewHabitLinkedEvents([]);
                setShowAddHabitModal(true);
              }}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 font-bold flex items-center justify-center gap-2 hover:border-sky-300 hover:text-sky-400 transition-all"
            >
              <Plus size={20} />
              添加新习惯
            </button>
          </div>
        )}

        {/* 添加/编辑习惯弹窗 */}
        {showAddHabitModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-black text-gray-800 mb-4">
                {editingHabit ? '编辑习惯' : '添加新习惯'}
              </h3>
              
              {/* 图标选择 */}
              <div className="mb-4">
                <label className="text-sm font-bold text-gray-600 mb-2 block">选择图标</label>
                <div className="flex flex-wrap gap-2">
                  {['✨', '🏃', '📚', '🧘', '💪', '🎯', '🌅', '💤', '🥗', '💧', '🎨', '🎵', '✍️', '🧠', '❤️', '🌟'].map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewHabitIcon(icon)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                        newHabitIcon === icon 
                          ? 'bg-sky-100 ring-2 ring-sky-400' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 习惯名称 */}
              <div className="mb-4">
                <label className="text-sm font-bold text-gray-600 mb-2 block">习惯名称</label>
                <input
                  type="text"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="例如：每日运动"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-400 focus:outline-none"
                />
              </div>
              
              {/* 关联事件（多选） */}
              <div className="mb-6">
                <label className="text-sm font-bold text-gray-600 mb-2 block">
                  关联数据源事件 
                  <span className="text-xs text-gray-400 font-normal ml-1">（可多选）</span>
                </label>
                
                {/* 已选择的事件 */}
                {newHabitLinkedEvents.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {newHabitLinkedEvents.map(eventName => (
                      <span 
                        key={eventName}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-sky-100 text-sky-700 rounded-lg text-xs"
                      >
                        {eventName}
                        <button
                          onClick={() => setNewHabitLinkedEvents(prev => prev.filter(e => e !== eventName))}
                          className="hover:text-sky-900"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {/* 事件选择列表 */}
                <div className="border border-gray-200 rounded-xl max-h-32 overflow-y-auto">
                  {uniqueEventNames.length === 0 ? (
                    <p className="text-xs text-gray-400 p-3 text-center">暂无可关联的事件</p>
                  ) : (
                    uniqueEventNames.map(name => (
                      <button
                        key={name}
                        onClick={() => {
                          if (newHabitLinkedEvents.includes(name)) {
                            setNewHabitLinkedEvents(prev => prev.filter(e => e !== name));
                          } else {
                            setNewHabitLinkedEvents(prev => [...prev, name]);
                          }
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 ${
                          newHabitLinkedEvents.includes(name) ? 'bg-sky-50' : ''
                        }`}
                      >
                        <span>{name}</span>
                        {newHabitLinkedEvents.includes(name) && (
                          <Check size={14} className="text-sky-500" />
                        )}
                      </button>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">任一关联事件有记录时，习惯自动标记为完成</p>
              </div>
              
              {/* 按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddHabitModal(false);
                    setEditingHabit(null);
                  }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (!newHabitName.trim()) {
                      alert('请输入习惯名称');
                      return;
                    }
                    if (newHabitLinkedEvents.length === 0) {
                      alert('请至少选择一个关联事件');
                      return;
                    }
                    
                    if (editingHabit) {
                      setTrackedHabits(prev => prev.map(h => 
                        h.id === editingHabit.id 
                          ? { ...h, name: newHabitName, icon: newHabitIcon, linkedEventNames: newHabitLinkedEvents }
                          : h
                      ));
                    } else {
                      setTrackedHabits(prev => [...prev, {
                        id: Date.now().toString(),
                        name: newHabitName,
                        icon: newHabitIcon,
                        linkedEventNames: newHabitLinkedEvents
                      }]);
                    }
                    
                    setShowAddHabitModal(false);
                    setEditingHabit(null);
                  }}
                  className="flex-1 py-3 rounded-xl text-white font-bold"
                  style={{ backgroundColor: '#89CFF0' }}
                >
                  {editingHabit ? '保存' : '添加'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 计划视图
const PlanView = ({ 
  pomodoroSettings,
  step,
  setStep,
  scheduleData,
  setScheduleData,
  tasks,
  setTasks,
  bedtime,
  setBedtime,
  lifestyle,
  setLifestyle,
  mentalStatus,
  setMentalStatus,
  bodyStatus,
  setBodyStatus,
  newTaskName,
  setNewTaskName,
  newTaskDuration,
  setNewTaskDuration,
  timeRecords,
  setTimeRecords,
  globalTimers,
  setGlobalTimers
}: { 
  pomodoroSettings: PomodoroSettings;
  step: 'setup' | 'generating' | 'schedule';
  setStep: (step: 'setup' | 'generating' | 'schedule') => void;
  scheduleData: any;
  setScheduleData: (data: any) => void;
  tasks: Array<{id: string, name: string, duration: number}>;
  setTasks: (tasks: Array<{id: string, name: string, duration: number}>) => void;
  bedtime: string;
  setBedtime: (bedtime: string) => void;
  lifestyle: {
    morningWash: boolean;
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    nightWash: boolean;
  };
  setLifestyle: (lifestyle: {
    morningWash: boolean;
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    nightWash: boolean;
  }) => void;
  mentalStatus: 'energetic' | 'normal' | 'tired' | 'anxious' | 'nervous' | 'sad' | 'angry';
  setMentalStatus: (status: 'energetic' | 'normal' | 'tired' | 'anxious' | 'nervous' | 'sad' | 'angry') => void;
  bodyStatus: 'good' | 'backPain' | 'headache' | 'periodPain' | 'wristPain';
  setBodyStatus: (status: 'good' | 'backPain' | 'headache' | 'periodPain' | 'wristPain') => void;
  newTaskName: string;
  setNewTaskName: (name: string) => void;
  newTaskDuration: number;
  setNewTaskDuration: (duration: number) => void;
  timeRecords: TimeRecord[];
  setTimeRecords: React.Dispatch<React.SetStateAction<TimeRecord[]>>;
  globalTimers: Timer[];
  setGlobalTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState<string>('');
  
  // 计时器状态
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0); // 正计时用
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [timerMode, setTimerMode] = useState<'countdown' | 'countup' | 'pomodoro'>('countdown');
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null); // 记录计时开始时间
  const [timerStartTimestamp, setTimerStartTimestamp] = useState<number | null>(null); // 持久化用时间戳
  const [currentTaskName, setCurrentTaskName] = useState<string>(''); // 当前任务名称
  
  // 番茄钟状态
  const [pomodoroConfig, setPomodoroConfig] = useState({
    workDuration: 25,
    breakDuration: 5,
    rounds: 4,
    longBreakDuration: 15
  });
  const [currentPomodoroRound, setCurrentPomodoroRound] = useState(1);
  const [pomodoroPhase, setPomodoroPhase] = useState<'work' | 'break' | 'longBreak'>('work');
  
  // 铃声播放状态
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  
  // 计时模式选择弹窗
  const [showTimerModeModal, setShowTimerModeModal] = useState(false);
  const [pendingTimerTask, setPendingTimerTask] = useState<{id: string, duration: number, name: string} | null>(null);
  const [_showPomodoroSettings, setShowPomodoroSettings] = useState(false);
  const [_showCountdownSettings, setShowCountdownSettings] = useState(false);
  const [countdownDuration, setCountdownDuration] = useState(25);
  
  // 切换计时确认弹窗
  const [showSwitchTimerConfirm, setShowSwitchTimerConfirm] = useState(false);
  const [pendingSwitchTask, setPendingSwitchTask] = useState<{id: string, duration: number, name: string, pomodoroSlots?: any[]} | null>(null);
  
  // 编辑模式状态
  const [isEditMode, setIsEditMode] = useState(false);
  
  // 编辑任务状态
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskDuration, setEditTaskDuration] = useState(25);
  
  // 状态区块折叠状态
  // 折叠状态管理 - 统一控制四个状态区块
  const [isStatusSectionExpanded, setIsStatusSectionExpanded] = useState(false);

  // 精神状态子选项
  const [mentalSubOption, setMentalSubOption] = useState<string>('');
  
  // 精神状态子选项配置
  const mentalSubOptions: Record<string, string[]> = {
    tired: ['没睡好', '工作了太久'],
    nervous: ['工作压力大', '金钱压力大'],
    sad: ['跟伴侣吵架', '跟家人吵架'],
    angry: ['讨厌原生家庭', '讨厌自己', '讨厌老板同事']
  };

  // 从localStorage恢复计时器状态
  useEffect(() => {
    const persistentState = loadPersistentTimerState();
    if (persistentState?.planTimer && persistentState.planTimer.status !== 'idle') {
      const { planTimer } = persistentState;
      
      if (planTimer.startTimestamp) {
        // 恢复计时器模式和配置
        setTimerMode(planTimer.timerMode);
        setPomodoroConfig(planTimer.pomodoroConfig);
        setCurrentPomodoroRound(planTimer.currentPomodoroRound);
        setPomodoroPhase(planTimer.pomodoroPhase);
        setActiveTimerId(planTimer.activeTimerId);
        setCurrentTaskName(planTimer.taskName);
        
        if (planTimer.status === 'running') {
          // 计算当前时间
          const { remainingTime: calcRemaining, elapsedTime: elapsed, isCompleted } = calculateCurrentTime(
            planTimer.startTimestamp,
            planTimer.totalDuration,
            planTimer.timerMode
          );
          
          if (isCompleted) {
            // 计时已完成，播放铃声
            alarmPlayer.play(10000);
            setIsAlarmPlaying(true);
            setTimeout(() => setIsAlarmPlaying(false), 10000);
            
            setTimerStatus('idle');
            setActiveTimerId(null);
            
            // 清除持久化状态
            savePersistentTimerState({ ...persistentState, planTimer: null });
          } else {
            // 恢复运行状态
            setTimerStartTimestamp(planTimer.startTimestamp);
            setElapsedTime(elapsed);
            setRemainingTime(calcRemaining);
            setTimerStatus('running');
          }
        } else if (planTimer.status === 'paused' && planTimer.pausedAt !== null) {
          // 恢复暂停状态
          if (planTimer.timerMode === 'countup') {
            setElapsedTime(planTimer.pausedAt);
          } else {
            setRemainingTime(planTimer.pausedAt);
          }
          setTimerStatus('paused');
        }
      }
    }
  }, []);

  // 保存计时器状态到localStorage
  useEffect(() => {
    if (timerStatus === 'running' || timerStatus === 'paused') {
      const persistentState = loadPersistentTimerState() || { focusTimer: null, planTimer: null };
      
      const planTimerState = {
        activeTimerId,
        timerMode,
        startTimestamp: timerStartTimestamp,
        pausedAt: timerStatus === 'paused' 
          ? (timerMode === 'countup' ? elapsedTime : remainingTime)
          : null,
        totalDuration: timerMode === 'countup' ? 0 : countdownDuration * 60,
        pomodoroConfig,
        currentPomodoroRound,
        pomodoroPhase,
        status: timerStatus as 'running' | 'paused',
        taskName: currentTaskName
      };
      
      savePersistentTimerState({ ...persistentState, planTimer: planTimerState });
    } else if (timerStatus === 'idle') {
      // 清除持久化状态
      const persistentState = loadPersistentTimerState();
      if (persistentState) {
        savePersistentTimerState({ ...persistentState, planTimer: null });
      }
    }
  }, [timerStatus, activeTimerId, timerStartTimestamp, elapsedTime, remainingTime, timerMode, pomodoroConfig, currentPomodoroRound, pomodoroPhase, currentTaskName, countdownDuration]);

  // 计时器逻辑
  useEffect(() => {
    let interval: number;
    
    if (timerStatus === 'running') {
      interval = window.setInterval(() => {
        if (timerMode === 'countup') {
          // 正计时模式
          setElapsedTime(prev => prev + 1);
        } else if (timerMode === 'countdown') {
          // 倒计时模式
          setRemainingTime(prev => {
            if (prev <= 1) {
              setTimerStatus('idle');
              setActiveTimerId(null);
              // 倒计时结束，播放铃声
              alarmPlayer.play(10000);
              setIsAlarmPlaying(true);
              setTimeout(() => setIsAlarmPlaying(false), 10000);
              return 0;
            }
            return prev - 1;
          });
        } else if (timerMode === 'pomodoro') {
          // 番茄钟模式
          setRemainingTime(prev => {
            if (prev <= 1) {
              // 当前阶段结束，播放铃声提醒
              alarmPlayer.play(10000);
              setIsAlarmPlaying(true);
              setTimeout(() => setIsAlarmPlaying(false), 10000);
              
              // 切换到下一阶段
              if (pomodoroPhase === 'work') {
                // 工作结束，判断是否需要长休息
                if (currentPomodoroRound >= pomodoroConfig.rounds) {
                  setPomodoroPhase('longBreak');
                  setCurrentPomodoroRound(1);
                  // 更新时间戳
                  setTimerStartTimestamp(Date.now());
                  return pomodoroConfig.longBreakDuration * 60;
                } else {
                  setPomodoroPhase('break');
                  // 更新时间戳
                  setTimerStartTimestamp(Date.now());
                  return pomodoroConfig.breakDuration * 60;
                }
              } else if (pomodoroPhase === 'break') {
                // 短休息结束，开始下一轮工作
                setPomodoroPhase('work');
                setCurrentPomodoroRound(prev => prev + 1);
                // 更新时间戳
                setTimerStartTimestamp(Date.now());
                return pomodoroConfig.workDuration * 60;
              } else {
                // 长休息结束，完成整个番茄钟周期
                setTimerStatus('idle');
                setActiveTimerId(null);
                setPomodoroPhase('work');
                return 0;
              }
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerStatus, timerMode, pomodoroPhase, currentPomodoroRound, pomodoroConfig]);

  // 监听计时器完成，保存记录
  useEffect(() => {
    if (timerStatus === 'idle' && timerStartTime && currentTaskName) {
      // 计时器完成时保存记录
      const endTime = new Date();
      const formatTimeStr = (date: Date) => {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      };
      const formatDateStr = (date: Date) => {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      };
      
      const newRecord: TimeRecord = {
        id: `plan_timer_${Date.now()}`,
        name: currentTaskName,
        date: formatDateStr(timerStartTime),
        startTime: formatTimeStr(timerStartTime),
        endTime: formatTimeStr(endTime),
        source: 'timer',
        categoryId: 'uncategorized',
        createdAt: Date.now()
      };
      
      setTimeRecords([...timeRecords, newRecord]);
      setTimerStartTime(null);
      setCurrentTaskName('');
    }
  }, [timerStatus]);

  // 打开计时模式选择弹窗
  const openTimerModeModal = (taskId: string, duration: number, taskName: string, pomodoroSlots?: any[]) => {
    // 检查是否有正在进行的计时
    if (timerStatus === 'running' || timerStatus === 'paused') {
      // 如果点击的是当前正在计时的任务，不做任何操作
      if (activeTimerId === taskId) return;
      
      // 显示确认弹窗
      setPendingSwitchTask({ id: taskId, duration, name: taskName, pomodoroSlots });
      setShowSwitchTimerConfirm(true);
      return;
    }
    
    // 没有正在进行的计时，直接打开模式选择弹窗
    openTimerModeModalDirect(taskId, duration, taskName, pomodoroSlots);
  };
  
  // 直接打开计时模式选择弹窗（不检查当前计时状态）
  const openTimerModeModalDirect = (taskId: string, duration: number, taskName: string, pomodoroSlots?: any[]) => {
    setPendingTimerTask({ id: taskId, duration, name: taskName });
    // 设置默认倒计时时长为AI计划的时长
    setCountdownDuration(duration);
    setShowCountdownSettings(false);
    // 如果任务有番茄钟配置，使用任务的配置并默认展开番茄钟设置；否则使用全局设置
    if (pomodoroSlots && pomodoroSlots.length > 0) {
      // 从AI生成的番茄钟配置中推断参数
      setPomodoroConfig({
        workDuration: pomodoroSettings.workDuration,
        breakDuration: pomodoroSettings.breakDuration,
        rounds: pomodoroSlots.length,
        longBreakDuration: pomodoroSettings.longBreakDuration
      });
      // 默认展开番茄钟设置
      setShowPomodoroSettings(true);
    } else {
      setPomodoroConfig({
        workDuration: pomodoroSettings.workDuration,
        breakDuration: pomodoroSettings.breakDuration,
        rounds: pomodoroSettings.rounds,
        longBreakDuration: pomodoroSettings.longBreakDuration
      });
      setShowPomodoroSettings(false);
    }
    setShowTimerModeModal(true);
  };

  // 确认开始计时
  const confirmStartTimer = (mode: 'countdown' | 'countup' | 'pomodoro') => {
    if (!pendingTimerTask) return;
    
    setTimerMode(mode);
    setActiveTimerId(pendingTimerTask.id);
    
    // 记录开始时间和任务名称
    setTimerStartTime(new Date());
    setTimerStartTimestamp(Date.now()); // 持久化用时间戳
    setCurrentTaskName(pendingTimerTask.name);
    
    // 添加计时器到全局计时器列表（待分类），按名称去重
    const existingTimer = globalTimers.find(t => t.categoryId === 'uncategorized' && t.name === pendingTimerTask.name);
    if (!existingTimer) {
      const newTimer: Timer = {
        id: `plan_${Date.now()}`,
        name: pendingTimerTask.name,
        icon: '📋',
        categoryId: 'uncategorized',
        duration: mode === 'countdown' ? countdownDuration : pendingTimerTask.duration,
        remainingTime: (mode === 'countdown' ? countdownDuration : pendingTimerTask.duration) * 60,
        status: 'running',
        createdAt: Date.now()
      };
      setGlobalTimers([...globalTimers, newTimer]);
    }
    
    if (mode === 'countup') {
      setElapsedTime(0);
    } else if (mode === 'countdown') {
      setRemainingTime(countdownDuration * 60);
    } else if (mode === 'pomodoro') {
      setRemainingTime(pomodoroConfig.workDuration * 60);
      setPomodoroPhase('work');
      setCurrentPomodoroRound(1);
    }
    
    setTimerStatus('running');
    setShowTimerModeModal(false);
    setPendingTimerTask(null);
  };

  // 保存计时记录到timeRecords
  const saveTimeRecord = () => {
    if (!timerStartTime || !currentTaskName) return;
    
    const endTime = new Date();
    const formatTimeStr = (date: Date) => {
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };
    const formatDateStr = (date: Date) => {
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    };
    
    const newRecord: TimeRecord = {
      id: `plan_timer_${Date.now()}`,
      name: currentTaskName,
      date: formatDateStr(timerStartTime),
      startTime: formatTimeStr(timerStartTime),
      endTime: formatTimeStr(endTime),
      source: 'timer',
      categoryId: 'uncategorized',
      createdAt: Date.now()
    };
    
    setTimeRecords([...timeRecords, newRecord]);
  };

  // 开始计时（旧方法保留兼容）
  const startTimer = (taskId: string, duration: number, taskName: string, pomodoroSlots?: any[]) => {
    openTimerModeModal(taskId, duration, taskName, pomodoroSlots);
  };
  
  // 确认切换计时（停止当前计时，开始新计时）
  const confirmSwitchTimer = () => {
    if (!pendingSwitchTask) return;
    
    // 保存当前计时记录
    saveTimeRecord();
    
    // 停止当前计时
    setTimerStatus('idle');
    setActiveTimerId(null);
    setRemainingTime(0);
    setElapsedTime(0);
    setPomodoroPhase('work');
    setCurrentPomodoroRound(1);
    
    // 关闭确认弹窗
    setShowSwitchTimerConfirm(false);
    
    // 打开新任务的计时模式选择弹窗
    openTimerModeModalDirect(
      pendingSwitchTask.id, 
      pendingSwitchTask.duration, 
      pendingSwitchTask.name, 
      pendingSwitchTask.pomodoroSlots
    );
    setPendingSwitchTask(null);
  };
  
  // 取消切换计时
  const cancelSwitchTimer = () => {
    setShowSwitchTimerConfirm(false);
    setPendingSwitchTask(null);
  };

  // 暂停计时
  const pauseTimer = () => {
    setTimerStatus('paused');
  };

  // 继续计时
  const resumeTimer = () => {
    // 继续计时时更新时间戳（基于当前剩余时间计算）
    if (timerMode === 'countup') {
      // 正计时：时间戳 = 当前时间 - 已过时间
      setTimerStartTimestamp(Date.now() - elapsedTime * 1000);
    } else {
      // 倒计时/番茄钟：时间戳 = 当前时间 - (总时长 - 剩余时间)
      const totalDuration = timerMode === 'pomodoro' 
        ? (pomodoroPhase === 'work' ? pomodoroConfig.workDuration : 
           pomodoroPhase === 'break' ? pomodoroConfig.breakDuration : pomodoroConfig.longBreakDuration) * 60
        : countdownDuration * 60;
      setTimerStartTimestamp(Date.now() - (totalDuration - remainingTime) * 1000);
    }
    setTimerStatus('running');
  };

  // 停止计时
  const stopTimer = () => {
    // 保存计时记录
    if (timerStartTime && currentTaskName) {
      saveTimeRecord();
    }
    
    setActiveTimerId(null);
    setRemainingTime(0);
    setElapsedTime(0);
    setTimerStatus('idle');
    setPomodoroPhase('work');
    setCurrentPomodoroRound(1);
    setTimerStartTime(null);
    setTimerStartTimestamp(null);
    setCurrentTaskName('');
  };

  // 跳过当前番茄钟阶段（提前休息/提前结束休息）
  const skipPomodoroPhase = () => {
    if (timerMode !== 'pomodoro') return;
    
    if (pomodoroPhase === 'work') {
      // 当前是专注阶段，跳到休息
      if (currentPomodoroRound >= pomodoroConfig.rounds) {
        // 已经是最后一轮，直接完成番茄钟
        setTimerStatus('idle');
        setActiveTimerId(null);
        setRemainingTime(0);
        setPomodoroPhase('work');
        setCurrentPomodoroRound(1);
        // 保存记录
        saveTimeRecord();
        setTimerStartTime(null);
        setCurrentTaskName('');
        return;
      } else {
        // 进入短休息
        setPomodoroPhase('break');
        setRemainingTime(pomodoroConfig.breakDuration * 60);
      }
    } else if (pomodoroPhase === 'break') {
      // 当前是短休息，跳到下一轮专注
      setPomodoroPhase('work');
      setCurrentPomodoroRound(prev => prev + 1);
      setRemainingTime(pomodoroConfig.workDuration * 60);
    } else {
      // 当前是长休息，完成番茄钟
      setTimerStatus('idle');
      setActiveTimerId(null);
      setRemainingTime(0);
      setPomodoroPhase('work');
      setCurrentPomodoroRound(1);
      // 保存记录
      saveTimeRecord();
      setTimerStartTime(null);
      setCurrentTaskName('');
    }
  };

  // 格式化剩余时间
  const formatRemainingTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 移动事项顺序
  const moveScheduleItem = (index: number, direction: 'up' | 'down') => {
    if (!scheduleData) return;
    const newSchedule = [...scheduleData.schedule];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSchedule.length) return;
    [newSchedule[index], newSchedule[targetIndex]] = [newSchedule[targetIndex], newSchedule[index]];
    setScheduleData({ ...scheduleData, schedule: newSchedule });
  };

  // 删除事项
  const deleteScheduleItem = (index: number) => {
    if (!scheduleData) return;
    const newSchedule = scheduleData.schedule.filter((_: any, i: number) => i !== index);
    setScheduleData({ ...scheduleData, schedule: newSchedule });
  };

  // 保存并重新计算时间线
  const saveScheduleChanges = () => {
    if (!scheduleData || scheduleData.schedule.length === 0) return;
    
    const now = new Date();
    let currentTime = now.getTime();
    
    const updatedSchedule = scheduleData.schedule.map((item: any) => {
      const startTime = currentTime;
      const endTime = startTime + item.duration * 60 * 1000;
      currentTime = endTime;
      
      return {
        ...item,
        start: startTime,
        end: endTime
      };
    });
    
    setScheduleData({ ...scheduleData, schedule: updatedSchedule });
    setIsEditMode(false);
  };

  const addTask = (name: string, duration: number = 25) => {
    if (name.trim()) {
      setTasks([...tasks, {
        id: Date.now().toString(),
        name: name.trim(),
        duration
      }]);
      setNewTaskName('');
      setNewTaskDuration(25);
    }
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateTask = (id: string, name: string, duration: number) => {
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, name: name.trim(), duration } : t
    ));
  };

  const startEditTask = (task: {id: string, name: string, duration: number}) => {
    setEditingTaskId(task.id);
    setEditTaskName(task.name);
    setEditTaskDuration(task.duration);
  };

  const saveEditTask = () => {
    if (editingTaskId && editTaskName.trim()) {
      updateTask(editingTaskId, editTaskName, editTaskDuration);
      setEditingTaskId(null);
      setEditTaskName('');
      setEditTaskDuration(25);
    }
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditTaskName('');
    setEditTaskDuration(25);
  };

  const callDeepSeekAPI = async (prompt: string, onProgress?: (text: string) => void) => {
    try {
      const response = await fetch('/api/deepseek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-d1fdb210d0424ffdbad83f1ebe4e283b'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的时间管理助手，擅长根据用户的任务、生活状态和精神状态制定合理的时间安排。请以JSON格式返回时间安排，包含每个时间段的开始时间、结束时间、任务名称、类型和图标。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullContent += content;
                onProgress?.(fullContent);
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      return fullContent;
    } catch (error) {
      console.error('DeepSeek API调用失败:', error);
      throw error;
    }
  };

  const generateSchedule = async () => {
    setIsGenerating(true);
    setStep('generating');
    setGeneratingStatus('准备发送请求...');
    
    try {
      // 构建提示词
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      
      const tasksText = tasks.map(task => `${task.name}(${task.duration}分钟)`).join('、');
      const lifestyleText = Object.entries(lifestyle)
        .filter(([_, value]) => !value)
        .map(([key, _]) => {
          const labels: Record<string, string> = {
            morningWash: '晨间洗漱',
            breakfast: '早餐',
            lunch: '午餐', 
            dinner: '晚餐',
            nightWash: '晚间洗漱'
          };
          return labels[key];
        })
        .join('、');
      
      const mentalStatusText = {
        energetic: '精力充沛',
        normal: '状态正常',
        tired: '感到疲惫',
        anxious: '感到焦虑',
        nervous: '感到紧张',
        sad: '感到伤心',
        angry: '感到生气'
      }[mentalStatus];

      const bodyStatusText = {
        good: '身体状态良好',
        backPain: '腰部疼痛',
        headache: '头部疼痛',
        periodPain: '生理期疼痛',
        wristPain: '手腕疼痛'
      }[bodyStatus];

      // 番茄钟设置说明
      const pomodoroInfo = `番茄钟设置：工作${pomodoroSettings.workDuration}分钟，休息${pomodoroSettings.breakDuration}分钟，每${pomodoroSettings.rounds}轮后长休息${pomodoroSettings.longBreakDuration}分钟`;

      // 精神状态详细描述（包含子选项）
      let mentalDetailText = mentalStatusText;
      if (mentalSubOption) {
        mentalDetailText += `，原因是：${mentalSubOption}`;
      }

      // 需要安慰语句的精神状态
      const needsComfort = ['tired', 'anxious', 'nervous', 'sad', 'angry'].includes(mentalStatus);

      const prompt = `请为我制定今日时间安排：

当前时间：${currentHour}:${currentMinute.toString().padStart(2, '0')}
睡觉时间：${bedtime}

今日任务：${tasksText || '无特定任务'}
需要安排的生活事项：${lifestyleText || '无'}
当前精神状态：${mentalDetailText}
当前身体状态：${bodyStatusText}
${pomodoroInfo}

请根据以上信息，制定一个合理的时间安排。要求：
1. 考虑当前时间，从现在开始安排
2. 根据精神状态调整任务难度和休息时间
3. 合理安排生活事项（用餐、洗漱等），注意：
   - "晨间洗漱"只能安排在6:00-13:00之间，如果当前时间已过13:00则不要安排
   - "晚间洗漱"只能安排在20:00到凌晨4:00之间
   - "早餐"只能安排在6:00-12:00之间
   - "午餐"只能安排在10:00-14:00之间
   - "晚餐"只能安排在17:00-22:00之间
   - 如果当前时间已经错过某个生活事项的合理时间段，则不要安排该事项
4. 确保在睡觉时间前完成所有安排
5. 任务之间留出适当的休息时间
6. 每个任务都要给出一条简短的执行建议（advice字段）
7. 对于需要久坐（持续时间超过40分钟）的任务，需要按照番茄钟设置拆分成多个番茄钟时间段（pomodoroSlots字段），每个时间段包含工作开始时间、工作结束时间、休息结束时间
8. 任务名称必须保持用户输入的原始名称，不要添加"第x部分"、"Part x"等后缀
${needsComfort ? `9. 由于用户当前精神状态不佳（${mentalDetailText}），请以专业心理医生的角色，在comfortSection字段中提供治愈内容。要求：
   - words: 2-3句默读话语，必须使用第一人称"我"来写，让用户默读时产生沉浸感
     例如："我允许自己感到疲惫"、"我值得被温柔对待"
   - actionTip: 1条简短的行动建议，帮助用户通过具体行动改善状态
     例如："起身倒杯温水，慢慢喝下"、"站起来伸展一下身体"
   - breathingTip: 1条呼吸练习建议，帮助用户平复情绪
     例如："深吸气4秒，屏住4秒，缓慢呼出6秒，重复3次"
   - 基于认知行为疗法或正念疗法的原则
   - 帮助用户接纳当前情绪，而不是否定它
   - 语气温暖、专业、有力量` : ''}

请以JSON格式返回，格式如下：
{
  ${needsComfort ? `"comfortSection": {
    "words": ["我允许自己...", "我值得...", "我正在..."],
    "actionTip": "起身倒杯温水，慢慢喝下",
    "breathingTip": "深吸气4秒，屏住4秒，缓慢呼出6秒，重复3次"
  },` : ''}
  "schedule": [
    {
      "id": "task1",
      "name": "任务名称",
      "start": "HH:MM",
      "end": "HH:MM", 
      "duration": 30,
      "type": "pomodoro|life|rest",
      "icon": "🎯",
      "advice": "执行该任务的简短建议",
      "pomodoroSlots": [
        {
          "workStart": "HH:MM",
          "workEnd": "HH:MM",
          "breakEnd": "HH:MM",
          "isLongBreak": false
        }
      ]
    }
  ]
}

注意：
- advice字段必须为每个任务提供
- pomodoroSlots字段只有当任务duration超过40分钟时才需要提供
- 番茄钟时间段要严格按照设置：工作${pomodoroSettings.workDuration}分钟，休息${pomodoroSettings.breakDuration}分钟，每${pomodoroSettings.rounds}轮后长休息${pomodoroSettings.longBreakDuration}分钟
${needsComfort ? '- comfortSection字段必须提供，包含words（默读话语）、actionTip（行动建议）、breathingTip（呼吸建议）' : ''}`;

      setGeneratingStatus('AI正在思考...');
      const aiResponse = await callDeepSeekAPI(prompt, (content) => {
        // 实时显示生成进度
        const charCount = content.length;
        if (charCount < 100) {
          setGeneratingStatus('AI正在分析你的任务...');
        } else if (charCount < 300) {
          setGeneratingStatus('AI正在规划时间安排...');
        } else if (charCount < 600) {
          setGeneratingStatus('AI正在优化建议...');
        } else {
          setGeneratingStatus('即将完成...');
        }
      });
      
      setGeneratingStatus('正在解析AI响应...');
      // 解析AI返回的JSON
      let parsedSchedule;
      try {
        // 尝试提取JSON部分
        let jsonStr = aiResponse;
        
        // 移除可能的markdown代码块标记
        jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // 尝试匹配最外层的JSON对象
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          // 清理可能的控制字符
          let cleanJson = jsonMatch[0]
            .replace(/[\x00-\x1F\x7F]/g, ' ')  // 移除控制字符
            .replace(/,\s*}/g, '}')  // 移除尾随逗号
            .replace(/,\s*]/g, ']'); // 移除数组尾随逗号
          
          parsedSchedule = JSON.parse(cleanJson);
        } else {
          throw new Error('无法从AI响应中提取JSON');
        }
        
        // 验证必要字段
        if (!parsedSchedule.schedule || !Array.isArray(parsedSchedule.schedule)) {
          throw new Error('AI响应缺少schedule字段');
        }
      } catch (parseError) {
        console.error('解析AI响应失败:', parseError);
        console.log('AI原始响应:', aiResponse);
        // 如果解析失败，使用备用方案
        throw new Error('AI响应格式错误，请重试');
      }

      setGeneratingStatus('正在生成时间安排...');
      // 转换时间格式并添加时间戳
      const today = new Date();
      const scheduleWithTimestamps = parsedSchedule.schedule.map((item: any) => {
        const [startHour, startMinute] = item.start.split(':').map(Number);
        const [endHour, endMinute] = item.end.split(':').map(Number);
        
        const startTime = new Date(today);
        startTime.setHours(startHour, startMinute, 0, 0);
        
        const endTime = new Date(today);
        endTime.setHours(endHour, endMinute, 0, 0);
        
        return {
          ...item,
          start: startTime.getTime(),
          end: endTime.getTime()
        };
      });

      const finalSchedule = {
        bedtimeMs: new Date().setHours(parseInt(bedtime.split(':')[0]), parseInt(bedtime.split(':')[1]), 0, 0),
        schedule: scheduleWithTimestamps,
        comfortSection: parsedSchedule.comfortSection || null
      };
      
      setScheduleData(finalSchedule);
      setIsGenerating(false);
      setGeneratingStatus('');
      setStep('schedule');
      
    } catch (error) {
      console.error('生成规划失败:', error);
      setIsGenerating(false);
      setGeneratingStatus('');
      
      // 显示错误信息并回退到设置页面
      const errorMessage = error instanceof Error ? error.message : 'AI规划生成失败，请检查网络连接后重试';
      alert(errorMessage);
      setStep('setup');
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (step === 'generating') {
    return (
      <div 
        className="flex flex-col h-full items-center justify-center p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #F0F5FF 0%, #FFFFFF 100%)' }}
      >
        {/* 背景装饰 */}
        <div className="absolute -right-10 top-10 w-40 h-40 rounded-full bg-teal-100 blur-2xl opacity-50"></div>
        <div className="absolute -left-10 bottom-20 w-32 h-32 rounded-full bg-orange-100 blur-xl opacity-40"></div>
        
        <div className="text-center z-10">
          {/* 呼吸光圈 */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-[#81ECEC] opacity-30" style={{ animation: 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite' }}></div>
            <div className="absolute inset-0 rounded-full bg-[#00D2D3]" style={{ animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></div>
          </div>
          <h3 className="text-xl font-black text-teal-700 mb-2">AI 正在规划中...</h3>
          <p className="text-gray-500 text-sm mb-8">DeepSeek正在为你制定最佳时间安排</p>
          
          {/* 加载动画 */}
          <div className="flex justify-center gap-1 mb-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          
          <div className="text-xs text-gray-400 space-y-1">
            <div>📋 分析你的{tasks.length}个任务</div>
            <div>🍽️ 考虑生活习惯安排</div>
            <div>⚡ 根据{
              mentalStatus === 'energetic' ? '充沛' : 
              mentalStatus === 'normal' ? '正常' : 
              mentalStatus === 'tired' ? '疲惫' :
              mentalStatus === 'anxious' ? '焦虑' :
              mentalStatus === 'nervous' ? '紧张' :
              mentalStatus === 'sad' ? '伤心' : '生气'
            }状态调整</div>
            <div>🌙 确保{bedtime}前完成所有安排</div>
            {generatingStatus && (
              <div className="mt-4 text-green-500 font-bold">
                {generatingStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'schedule' && scheduleData) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'linear-gradient(135deg, #F0FFF4 0%, #E6FFFA 100%)' }}>
        {/* 头部 */}
        <div className="px-6 pt-8 pb-4 flex justify-between items-center">
          <button 
            onClick={() => setStep('setup')}
            className="text-gray-400 hover:text-gray-600 p-2 -ml-2"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="font-bold text-[#2D3436]">今日规划</span>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <button 
                onClick={saveScheduleChanges}
                className="text-green-500 font-bold p-2"
              >
                <Check size={20} />
              </button>
            ) : (
              <button 
                onClick={() => setIsEditMode(true)}
                className="text-blue-500 font-bold p-2"
              >
                <Edit3 size={20} />
              </button>
            )}
            <button 
              onClick={generateSchedule}
              className="text-[#42D4A4] font-bold p-2 -mr-2"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        {/* 编辑模式提示 */}
        {isEditMode && (
          <div className="mx-6 mb-4 bg-blue-50 rounded-2xl p-3 border border-blue-100">
            <p className="text-sm text-blue-600 font-medium">
              📝 可通过点击上下箭头调整事项顺序、或者直接删除不想要的事项，保存后将自动重排时间
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* 安慰语句卡片 */}
          {scheduleData.comfortSection && (
            <div className="rounded-3xl p-5 mb-6 relative overflow-hidden border border-white/50 shadow-sm" style={{ backgroundColor: '#FFF3E0' }}>
              <div className="absolute top-3 right-3 opacity-30">
                <Heart size={32} className="text-[#FFAB91]" />
              </div>
              <div className="relative z-10">
                {/* 默读话语 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">💝</span>
                  <h3 className="text-sm font-black text-[#5D4037]">在开始之前，请默读以下话语</h3>
                </div>
                <div className="space-y-3 mb-4">
                  {scheduleData.comfortSection.words?.map((word: string, index: number) => (
                    <p key={index} className="text-sm leading-relaxed pl-4 border-l-2" style={{ color: '#5D4037', borderLeftColor: '#FFAB91' }}>
                      {word}
                    </p>
                  ))}
                </div>
                
                {/* 行动建议 */}
                {scheduleData.comfortSection.actionTip && (
                  <div className="flex items-start gap-2 mb-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,171,145,0.2)' }}>
                    <span className="text-base">🚶</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#5D4037] mb-1">行动建议</h4>
                      <p className="text-sm text-[#5D4037]">{scheduleData.comfortSection.actionTip}</p>
                    </div>
                  </div>
                )}
                
                {/* 呼吸建议 */}
                {scheduleData.comfortSection.breathingTip && (
                  <div className="flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,171,145,0.2)' }}>
                    <span className="text-base">🌬️</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#5D4037] mb-1">呼吸练习</h4>
                      <p className="text-sm text-[#5D4037]">{scheduleData.comfortSection.breathingTip}</p>
                    </div>
                  </div>
                )}
                
                <p className="text-[10px] mt-4 text-center" style={{ color: '#5D4037', opacity: 0.7 }}>
                  深呼吸，你已经做得很好了 ✨
                </p>
              </div>
            </div>
          )}

          {/* 时间安排列表 */}
          <div className="relative">
            {(() => {
              const now = Date.now();
              let timelineInserted = false;
              const totalItems = scheduleData.schedule.length;
              
              return scheduleData.schedule.map((item: any, index: number) => {
                const isActive = activeTimerId === (item.id || `task-${index}`);
                const taskId = item.id || `task-${index}`;
                const isPast = item.end < now;
                const isLast = index === totalItems - 1;
                
                // 判断是否需要在此任务前插入时间线
                const prevItem = index > 0 ? scheduleData.schedule[index - 1] : null;
                const shouldInsertTimeline = !timelineInserted && !isPast && (prevItem ? prevItem.end < now : true) && item.start > now;
                if (shouldInsertTimeline) timelineInserted = true;
                
                return (
                  <div key={taskId} className="relative">
                    {/* 当前时间线 */}
                    {shouldInsertTimeline && (
                      <div className="flex items-center gap-3 py-2 mb-5">
                        <div className="w-3 h-3 rounded-full bg-[#00B894] shadow-lg shadow-[#00B894]/50"></div>
                        <div className="flex-1 h-[2px] bg-gradient-to-r from-[#00B894] to-transparent"></div>
                        <span className="text-xs font-bold text-[#00B894] whitespace-nowrap">
                          现在 {new Date().getHours().toString().padStart(2, '0')}:{new Date().getMinutes().toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}
                    
                    <div 
                      className={`rounded-3xl shadow-sm border-2 transition-all overflow-hidden ${
                        isActive ? 'border-green-400 shadow-lg' : isEditMode ? 'border-blue-200' : 'border-gray-50'
                      } ${isPast && !isEditMode ? 'opacity-50' : ''}`}
                    >
                  {/* 顶部时间横条 */}
                  <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: '#E0F2F1' }}>
                    <span className="text-sm font-bold" style={{ color: '#00695C' }}>
                      🕒 {formatTime(item.start)} - {formatTime(item.end)}
                    </span>
                    {/* 编辑模式删除按钮 */}
                    {isEditMode && (
                      <button
                        onClick={() => deleteScheduleItem(index)}
                        className="w-6 h-6 rounded-full flex items-center justify-center hover:opacity-70 transition-all"
                        style={{ backgroundColor: '#F5F7FA', color: '#666666' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  
                  {/* 下半部分白色区域 */}
                  <div className="bg-white p-4">
                  {/* 编辑模式控制按钮 */}
                  {isEditMode && (
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveScheduleItem(index, 'up')}
                          disabled={index === 0}
                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-30"
                        >
                          <ChevronLeft size={16} className="rotate-90" />
                        </button>
                        <button
                          onClick={() => moveScheduleItem(index, 'down')}
                          disabled={index === scheduleData.schedule.length - 1}
                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-30"
                        >
                          <ChevronLeft size={16} className="-rotate-90" />
                        </button>
                        <span className="text-xs text-gray-400 ml-2">第 {index + 1} 项</span>
                      </div>
                    </div>
                  )}

                  {/* 计时器显示 */}
                  {isActive && !isEditMode && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl">
                      <div className="text-center">
                        {/* 模式标签 */}
                        <div className="flex justify-center mb-2">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            timerMode === 'countup' ? 'bg-blue-100 text-blue-600' :
                            timerMode === 'pomodoro' ? 'bg-red-100 text-red-600' :
                            'bg-green-100 text-green-600'
                          }`}>
                            {timerMode === 'countup' ? '⏱️ 正计时' :
                             timerMode === 'pomodoro' ? `🍅 番茄钟 · ${pomodoroPhase === 'work' ? '专注' : pomodoroPhase === 'break' ? '休息' : '长休息'}` :
                             '⏳ 倒计时'}
                          </span>
                        </div>
                        
                        {/* 番茄钟轮次显示 */}
                        {timerMode === 'pomodoro' && (
                          <div className="text-xs text-gray-500 mb-2">
                            第 {currentPomodoroRound} / {pomodoroConfig.rounds} 轮
                          </div>
                        )}
                        
                        <div className="text-4xl font-black text-[#2D3436] font-mono mb-2">
                          {timerMode === 'countup' ? formatRemainingTime(elapsedTime) : formatRemainingTime(remainingTime)}
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                          {timerStatus === 'running' ? 
                            (timerMode === 'pomodoro' && pomodoroPhase !== 'work' ? '休息中...' : '专注进行中...') : 
                            '已暂停'}
                        </p>
                        <div className="flex justify-center gap-3">
                          {timerStatus === 'running' ? (
                            <button
                              onClick={pauseTimer}
                              className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-all"
                            >
                              <div className="flex gap-0.5">
                                <div className="w-1 h-4 bg-gray-400 rounded-sm"></div>
                                <div className="w-1 h-4 bg-gray-400 rounded-sm"></div>
                              </div>
                            </button>
                          ) : (
                            <button
                              onClick={resumeTimer}
                              className="w-12 h-12 rounded-full bg-[#00B894] flex items-center justify-center text-white shadow-lg hover:bg-[#00a383] transition-all"
                            >
                              <Play size={20} />
                            </button>
                          )}
                          {/* 番茄钟跳过按钮 */}
                          {timerMode === 'pomodoro' && (
                            <button
                              onClick={skipPomodoroPhase}
                              className="px-3 h-10 rounded-full border-2 border-orange-300 flex items-center justify-center text-orange-400 hover:border-orange-400 hover:text-orange-500 transition-all text-xs font-bold whitespace-nowrap"
                            >
                              {pomodoroPhase === 'work' ? '跳过' : '跳过休息'}
                            </button>
                          )}
                          <button
                            onClick={stopTimer}
                            className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-all"
                          >
                            <X size={18} />
                          </button>
                          {/* 停止铃声按钮 */}
                          {isAlarmPlaying && (
                            <button
                              onClick={() => {
                                alarmPlayer.stop();
                                setIsAlarmPlaying(false);
                              }}
                              className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center text-white shadow-lg hover:bg-pink-600 transition-all animate-pulse"
                            >
                              🔔
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="mb-1" style={{ fontSize: '20px', fontWeight: 700, color: '#2D3436' }}>{item.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{item.duration}分钟</span>
                      </div>
                      {/* AI建议 */}
                      {item.advice && !isEditMode && (
                        <p className="text-xs text-gray-400 mt-1" style={{ lineHeight: '1.5' }}>
                          💡 {item.advice}
                        </p>
                      )}
                    </div>
                    
                    {!isActive && !isEditMode && (
                      <button 
                        onClick={() => startTimer(taskId, item.duration, item.name, item.pomodoroSlots)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
                        style={{ backgroundColor: '#00B894' }}
                      >
                        <Play size={16} />
                      </button>
                    )}
                  </div>
                  
                  {/* 番茄钟时间段 - 合并展示 */}
                  {item.pomodoroSlots && item.pomodoroSlots.length > 0 && !isEditMode && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F7F9FC' }}>
                        <span className="text-2xl">🍅</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                            <span>番茄钟模式</span>
                            <span className="text-xs font-normal text-gray-500">
                              {item.pomodoroSlots[0]?.workStart} - {item.pomodoroSlots[item.pomodoroSlots.length - 1]?.breakEnd}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            共 {item.pomodoroSlots.length} 轮 · 专注 {item.pomodoroSlots.filter((s: any) => !s.isLongBreak).length > 0 ? `${25}分钟` : ''} · 休息 {item.pomodoroSlots.some((s: any) => s.isLongBreak) ? '含长休息' : '5分钟/轮'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
                
                {/* 卡片之间的连接线 */}
                {!isLast && (
                  <div className="flex justify-center py-2">
                    <div className="w-[2px] h-6 bg-gray-200"></div>
                  </div>
                )}
              </div>
            );
          })})()}
          </div>

          {/* 底部按钮 */}
          <div className="mt-8">
            {isEditMode ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsEditMode(false)}
                  className="w-[30%] text-center font-bold hover:opacity-70 transition-all"
                  style={{ color: '#999999' }}
                >
                  取消
                </button>
                <Button 
                  onClick={saveScheduleChanges}
                  className="w-[70%] shadow-[0_8px_0_0_#008E72] hover:shadow-[0_6px_0_0_#008E72] hover:translate-y-[2px] active:shadow-none active:translate-y-[8px]"
                  style={{ backgroundColor: '#00B894', color: '#FFFFFF' }}
                >
                  <Check size={18} />
                  保存
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => {
                  // 用当前scheduleData中的任务更新tasks，保留用户的修改
                  if (scheduleData?.schedule) {
                    const updatedTasks = scheduleData.schedule
                      .filter((item: any) => item.type === 'pomodoro') // 只保留任务类型，排除生活事项
                      .map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        duration: item.duration
                      }));
                    if (updatedTasks.length > 0) {
                      setTasks(updatedTasks);
                    }
                  }
                  setStep('setup');
                }}
                variant="outline"
                style={{ borderColor: '#42D4A4', color: '#42D4A4' }}
              >
                <Edit3 size={20} />
                重新让AI规划今日安排
              </Button>
            )}
          </div>
        </div>

        {/* 切换计时确认弹窗 */}
        {showSwitchTimerConfirm && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={cancelSwitchTimer}
          >
            <div 
              className="bg-white rounded-3xl p-6 w-full max-w-sm"
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-black text-[#2D3436] mb-3 text-center">切换计时任务</h3>
              <p className="text-sm text-gray-500 text-center mb-2">
                当前正在进行「{currentTaskName}」的计时
              </p>
              <p className="text-sm text-gray-500 text-center mb-6">
                是否停止当前计时，开始「{pendingSwitchTask?.name}」？
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelSwitchTimer}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  继续当前
                </button>
                <button
                  onClick={confirmSwitchTimer}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all"
                  style={{ backgroundColor: '#00B894' }}
                >
                  切换任务
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 计时模式选择弹窗 */}
        {showTimerModeModal && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowTimerModeModal(false);
              setPendingTimerTask(null);
              setShowPomodoroSettings(false);
              setShowCountdownSettings(false);
            }}
          >
            <div 
              className="bg-white rounded-3xl p-6 w-full max-w-sm relative max-h-[85%] overflow-y-auto"
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 60px rgba(0, 0, 0, 0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 关闭按钮 */}
              <button
                onClick={() => {
                  setShowTimerModeModal(false);
                  setPendingTimerTask(null);
                  setShowPomodoroSettings(false);
                  setShowCountdownSettings(false);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-all"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-xl font-black text-[#2D3436] mb-4 text-center">选择计时模式</h3>
              
              {/* 顶部Tab切换 */}
              <div className="flex rounded-2xl bg-gray-100 p-1 mb-4">
                <button
                  onClick={() => setTimerMode('countup')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                    timerMode === 'countup' ? 'bg-white text-[#5C7CFA] shadow-sm' : 'text-gray-500'
                  }`}
                >
                  ⏱️ 正计时
                </button>
                <button
                  onClick={() => setTimerMode('countdown')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                    timerMode === 'countdown' ? 'bg-white text-[#009688] shadow-sm' : 'text-gray-500'
                  }`}
                >
                  ⏳ 倒计时
                </button>
                <button
                  onClick={() => setTimerMode('pomodoro')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                    timerMode === 'pomodoro' ? 'bg-white text-[#FF7675] shadow-sm' : 'text-gray-500'
                  }`}
                >
                  🍅 番茄钟
                </button>
              </div>
              
              {/* 内容区域 */}
              <div className="min-h-[200px]">
                {/* 正计时内容 */}
                {timerMode === 'countup' && (
                  <div className="p-4 rounded-2xl" style={{ backgroundColor: '#EEF2FF' }}>
                    <div className="text-center mb-4">
                      <div className="text-4xl mb-2">⏱️</div>
                      <div className="font-bold text-lg" style={{ color: '#5C7CFA' }}>正计时模式</div>
                      <div className="text-sm text-gray-500 mt-2">从0开始计时，记录实际用时</div>
                    </div>
                    <button
                      onClick={() => confirmStartTimer('countup')}
                      className="w-full py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all"
                      style={{ backgroundColor: '#5C7CFA' }}
                    >
                      开始计时
                    </button>
                  </div>
                )}
                
                {/* 倒计时内容 */}
                {timerMode === 'countdown' && (
                  <div className="p-4 rounded-2xl" style={{ backgroundColor: '#E0F2F1' }}>
                    <div className="text-center mb-4">
                      <div className="text-4xl mb-2">⏳</div>
                      <div className="font-bold text-lg" style={{ color: '#009688' }}>倒计时模式</div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">倒计时时长</span>
                        <span className="text-lg font-bold text-[#009688]">{countdownDuration} 分钟</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="180"
                        value={countdownDuration}
                        onChange={(e) => setCountdownDuration(Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-2 bg-[#B2DFDB] rounded-full appearance-none cursor-pointer accent-[#009688]"
                        style={{
                          background: `linear-gradient(to right, #009688 0%, #009688 ${(countdownDuration / 180) * 100}%, #B2DFDB ${(countdownDuration / 180) * 100}%, #B2DFDB 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>1分</span>
                        <span>180分</span>
                      </div>
                      <button
                        onClick={() => confirmStartTimer('countdown')}
                        className="w-full mt-2 py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all"
                        style={{ backgroundColor: '#009688' }}
                      >
                        开始计时
                      </button>
                    </div>
                  </div>
                )}
                
                {/* 番茄钟内容 */}
                {timerMode === 'pomodoro' && (
                  <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FFF0F0' }}>
                    <div className="text-center mb-4">
                      <div className="text-4xl mb-2">🍅</div>
                      <div className="font-bold text-lg" style={{ color: '#FF7675' }}>番茄钟模式</div>
                      <div className="text-xs text-gray-500 mt-1">专注与休息交替进行</div>
                    </div>
                    <div className="space-y-3">
                      {/* 专注时长 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">专注时长</span>
                          <span className="text-sm font-bold text-[#FF7675]">{pomodoroConfig.workDuration} 分钟</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="90"
                          value={pomodoroConfig.workDuration}
                          onChange={(e) => setPomodoroConfig(prev => ({ ...prev, workDuration: Number(e.target.value) }))}
                          className="w-full h-2 bg-red-100 rounded-full appearance-none cursor-pointer accent-[#FF7675]"
                          style={{
                            background: `linear-gradient(to right, #FF7675 0%, #FF7675 ${((pomodoroConfig.workDuration - 5) / 85) * 100}%, #FFCDD2 ${((pomodoroConfig.workDuration - 5) / 85) * 100}%, #FFCDD2 100%)`
                          }}
                        />
                      </div>
                      
                      {/* 休息时长 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">休息时长</span>
                          <span className="text-sm font-bold text-[#FF7675]">{pomodoroConfig.breakDuration} 分钟</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="30"
                          value={pomodoroConfig.breakDuration}
                          onChange={(e) => setPomodoroConfig(prev => ({ ...prev, breakDuration: Number(e.target.value) }))}
                          className="w-full h-2 bg-red-100 rounded-full appearance-none cursor-pointer accent-[#FF7675]"
                          style={{
                            background: `linear-gradient(to right, #FF7675 0%, #FF7675 ${((pomodoroConfig.breakDuration - 1) / 29) * 100}%, #FFCDD2 ${((pomodoroConfig.breakDuration - 1) / 29) * 100}%, #FFCDD2 100%)`
                          }}
                        />
                      </div>
                      
                      {/* 轮数 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">几轮后长休息</span>
                          <span className="text-sm font-bold text-[#FF7675]">{pomodoroConfig.rounds} 轮</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={pomodoroConfig.rounds}
                          onChange={(e) => setPomodoroConfig(prev => ({ ...prev, rounds: Number(e.target.value) }))}
                          className="w-full h-2 bg-red-100 rounded-full appearance-none cursor-pointer accent-[#FF7675]"
                          style={{
                            background: `linear-gradient(to right, #FF7675 0%, #FF7675 ${((pomodoroConfig.rounds - 1) / 9) * 100}%, #FFCDD2 ${((pomodoroConfig.rounds - 1) / 9) * 100}%, #FFCDD2 100%)`
                          }}
                        />
                      </div>
                      
                      {/* 长休息时长 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">长休息时长</span>
                          <span className="text-sm font-bold text-[#FF7675]">{pomodoroConfig.longBreakDuration} 分钟</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="60"
                          value={pomodoroConfig.longBreakDuration}
                          onChange={(e) => setPomodoroConfig(prev => ({ ...prev, longBreakDuration: Number(e.target.value) }))}
                          className="w-full h-2 bg-red-100 rounded-full appearance-none cursor-pointer accent-[#FF7675]"
                          style={{
                            background: `linear-gradient(to right, #FF7675 0%, #FF7675 ${((pomodoroConfig.longBreakDuration - 5) / 55) * 100}%, #FFCDD2 ${((pomodoroConfig.longBreakDuration - 5) / 55) * 100}%, #FFCDD2 100%)`
                          }}
                        />
                      </div>
                      
                      <button
                        onClick={() => confirmStartTimer('pomodoro')}
                        className="w-full mt-2 py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all"
                        style={{ backgroundColor: '#FF7675' }}
                      >
                        开始专注
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F0FFF4 0%, #E6FFFA 100%)' }}>
      {/* 背景装饰 */}
      <div className="absolute -right-10 top-10 w-40 h-40 rounded-full bg-teal-100 blur-2xl opacity-50"></div>
      <div className="absolute -left-10 bottom-40 w-32 h-32 rounded-full bg-orange-100 blur-xl opacity-40"></div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 z-10">
        {/* 头部 - 随页面滚动 */}
        <div className="pt-8 pb-4 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-[#2D3436] mb-2">
                {(() => {
                  const now = new Date();
                  const month = now.getMonth() + 1;
                  const date = now.getDate();
                  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                  const weekday = weekdays[now.getDay()];
                  return `${month}月${date}日 · ${weekday}`;
                })()}
              </h2>
              <div className="w-2 h-2 rounded-full bg-orange-200 ring-2 ring-teal-200"></div>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {(() => {
                const hour = new Date().getHours();
                if (hour >= 5 && hour < 12) {
                  return '早上好，今天也是充满活力的一天';
                } else if (hour >= 12 && hour < 18) {
                  return '下午好，现在开始新的一天也不晚';
                } else {
                  return '晚上好，晚上有什么想做的事情吗？';
                }
              })()}
            </p>
          </div>
        </div>
        {/* 添加任务 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-5 shadow-sm mb-6 border-2 border-teal-100">
          <div className="space-y-3 mb-4">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-2xl border border-teal-100 border-l-4" style={{ backgroundColor: '#FDFFFC', borderLeftColor: '#55EFC4' }}>
                {editingTaskId === task.id ? (
                  // 编辑模式
                  <>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={editTaskName}
                        onChange={(e) => setEditTaskName(e.target.value)}
                        className="w-full bg-white rounded-lg px-3 py-2 text-sm outline-none border-2 border-teal-200 focus:ring-2 focus:ring-teal-300"
                        placeholder="任务名称"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            saveEditTask();
                          } else if (e.key === 'Escape') {
                            cancelEditTask();
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-teal-600 whitespace-nowrap">时长</span>
                        <input
                          type="range"
                          min="1"
                          max="360"
                          value={editTaskDuration}
                          onChange={(e) => setEditTaskDuration(Number(e.target.value))}
                          className="flex-1 h-1 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #A8E6CF 0%, #42E2B8 100%)`,
                            outline: 'none'
                          }}
                        />
                        <span className="text-xs font-bold text-teal-700 w-16 text-right">
                          {editTaskDuration >= 60 
                            ? `${Math.floor(editTaskDuration / 60)}h${editTaskDuration % 60 > 0 ? editTaskDuration % 60 + 'm' : ''}`
                            : `${editTaskDuration}min`
                          }
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={saveEditTask}
                        className="text-teal-500 hover:text-teal-700 p-1 transition-colors"
                        title="保存"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={cancelEditTask}
                        className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
                        title="取消"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  // 显示模式
                  <>
                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-lg font-semibold text-[#2D3436]">{task.name}</span>
                      <span className="px-2 py-1 bg-[#CFF5E7] text-[#009688] text-xs font-medium rounded-full">
                        {task.duration >= 60 
                          ? `${Math.floor(task.duration / 60)}h${task.duration % 60 > 0 ? task.duration % 60 + 'm' : ''}`
                          : `${task.duration}min`
                        }
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => startEditTask(task)}
                        className="text-teal-400 hover:text-teal-600 p-1 transition-colors"
                        title="编辑"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => removeTask(task.id)}
                        className="text-teal-300 hover:text-red-400 p-1 transition-colors"
                        title="删除"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* 任务名称输入 */}
          <div className="space-y-3">
            <textarea
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="输入今天想做的事，AI 帮你规划行程～"
              className="w-full rounded-xl px-4 py-3 text-base outline-none border-2 border-teal-200 focus:ring-2 focus:ring-teal-300 shadow-sm resize-none"
              style={{ background: 'rgba(255, 255, 255, 0.6)' }}
              rows={2}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && newTaskName.trim()) {
                  e.preventDefault();
                  addTask(newTaskName, newTaskDuration);
                }
              }}
            />
            
            {/* 时长选择 */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-teal-600 whitespace-nowrap">预计时长</span>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="360"
                  value={newTaskDuration}
                  onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #A8E6CF 0%, #42E2B8 100%)`,
                    outline: 'none'
                  }}
                />
                <span className="text-sm font-black text-teal-700 w-20 text-right">
                  {newTaskDuration >= 60 
                    ? `${Math.floor(newTaskDuration / 60)}h${newTaskDuration % 60 > 0 ? newTaskDuration % 60 + 'm' : ''}`
                    : `${newTaskDuration}min`
                  }
                </span>
              </div>
            </div>

            {/* 快捷时长选择 */}
            <div className="flex gap-2 flex-wrap">
              {[15, 30, 60, 120, 180, 240].map(duration => (
                <button
                  key={duration}
                  onClick={() => setNewTaskDuration(duration)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    newTaskDuration === duration
                      ? 'bg-teal-500 text-white shadow-md'
                      : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                  }`}
                >
                  {duration >= 60 ? `${duration / 60}h` : `${duration}min`}
                </button>
              ))}
            </div>

            {/* 添加按钮 */}
            <button 
              onClick={() => {
                if (newTaskName.trim()) {
                  addTask(newTaskName, newTaskDuration);
                }
              }}
              disabled={!newTaskName.trim()}
              className="w-full h-12 rounded-xl flex items-center justify-center text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#55EFC4' }}
            >
              <Plus size={20} className="mr-2" />
              添加任务
            </button>
          </div>
        </div>

        {/* 状态设置（折叠组） */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 border-2 border-teal-100">
          <h3 className="font-black text-[#2D3436] flex items-center gap-2">
            <Brain size={20} className="text-teal-500" />
            状态设置
          </h3>
          
          {!isStatusSectionExpanded ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-3">
                设置当下"身体/精神状态"，AI为你贴身打造今日计划
              </p>
              <button 
                onClick={() => setIsStatusSectionExpanded(true)}
                className="inline-flex items-center gap-1 text-xs text-teal-500 font-bold hover:text-teal-600 transition-colors"
              >
                展开设置
                <ChevronRight size={14} className="rotate-90" />
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              {/* 生活状态 */}
              <div>
                <h4 className="font-bold text-[#2D3436] flex items-center gap-2 mb-3">
                  <Utensils size={16} className="text-orange-500" />
                  生活状态
                </h4>
                <p className="text-xs text-gray-400 mb-3">点亮已经完成的事情，未完成的事情将自动纳入计划。</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'morningWash', label: '晨间洗漱', icon: '🚿' },
                    { key: 'breakfast', label: '早餐', icon: '🍳' },
                    { key: 'lunch', label: '午餐', icon: '🍽️' },
                    { key: 'dinner', label: '晚餐', icon: '🍜' },
                    { key: 'nightWash', label: '晚间洗漱', icon: '🛁' }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setLifestyle({
                        ...lifestyle,
                        [item.key]: !lifestyle[item.key as keyof typeof lifestyle]
                      })}
                      className={`p-3 rounded-2xl border-2 transition-all ${
                        lifestyle[item.key as keyof typeof lifestyle]
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      <div className="text-lg mb-1">{item.icon}</div>
                      <div className="text-xs font-bold">{item.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 分隔线 */}
              <div className="border-t border-gray-100"></div>

              {/* 精神状态 */}
              <div>
                <h4 className="font-bold text-[#2D3436] flex items-center gap-2 mb-3">
                  <Zap size={16} className="text-yellow-500" />
                  精神状态
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'energetic', label: '充沛', emoji: '⚡', color: '#FFD23F' },
                    { id: 'normal', label: '正常', emoji: '😊', color: '#42D4A4' },
                    { id: 'tired', label: '疲惫', emoji: '😴', color: '#6CB6FF' },
                    { id: 'anxious', label: '焦虑', emoji: '😰', color: '#FF8CA1' },
                    { id: 'nervous', label: '紧张', emoji: '😬', color: '#B589F6' },
                    { id: 'sad', label: '伤心', emoji: '😢', color: '#7dd3fc' },
                    { id: 'angry', label: '生气', emoji: '😠', color: '#f87171' }
                  ].map(status => {
                    const hasSubOptions = mentalSubOptions[status.id];
                    const isSelected = mentalStatus === status.id;
                    const hasSelectedSubOption = isSelected && hasSubOptions && mentalSubOption;
                    const showBubble = isSelected && hasSubOptions && !mentalSubOption;
                    
                    return (
                      <div key={status.id} className="relative">
                        <button
                          onClick={() => {
                            setMentalStatus(status.id as any);
                            if (!mentalSubOptions[status.id]) {
                              setMentalSubOption('');
                            }
                            if (mentalStatus !== status.id) {
                              setMentalSubOption('');
                            }
                          }}
                          className={`w-full p-2 rounded-2xl border-2 transition-all ${
                            isSelected
                              ? 'border-2 shadow-md'
                              : 'border-gray-200 opacity-60'
                          }`}
                          style={{
                            borderColor: isSelected ? status.color : undefined,
                            backgroundColor: isSelected ? status.color + '20' : '#F9FAFB'
                          }}
                        >
                          <div className="text-xl mb-1">{status.emoji}</div>
                          <div className="text-[10px] font-bold text-gray-700">{status.label}</div>
                          {hasSelectedSubOption && (
                            <div 
                              className="text-[8px] font-bold mt-1 truncate"
                              style={{ color: status.color }}
                            >
                              {mentalSubOption}
                            </div>
                          )}
                        </button>
                        
                        {showBubble && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 animate-fade-in">
                            <div 
                              className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-transparent"
                              style={{ borderBottomColor: '#FFFFFF' }}
                            />
                            <div 
                              className="rounded-2xl p-3 min-w-[120px]"
                              style={{ 
                                backgroundColor: '#FFFFFF', 
                                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                                border: 'none'
                              }}
                            >
                              <div className="space-y-2">
                                {mentalSubOptions[status.id].map(option => (
                                  <button
                                    key={option}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMentalSubOption(option);
                                    }}
                                    className="w-full px-3 py-2 rounded-lg text-xs font-medium transition-all bg-gray-50 hover:bg-gray-100 border border-gray-200 whitespace-nowrap"
                                    style={{ color: '#333333' }}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 分隔线 */}
              <div className="border-t border-gray-100"></div>

              {/* 身体状态 */}
              <div>
                <h4 className="font-bold text-[#2D3436] flex items-center gap-2 mb-3">
                  <Heart size={16} className="text-red-400" />
                  身体状态
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'good', label: '良好', emoji: '💪', color: '#42D4A4' },
                    { id: 'backPain', label: '腰疼', emoji: '🦴', color: '#FF8CA1' },
                    { id: 'headache', label: '头疼', emoji: '🤕', color: '#FFD23F' },
                    { id: 'periodPain', label: '姨妈疼', emoji: '💔', color: '#f472b6' },
                    { id: 'wristPain', label: '手腕疼', emoji: '✋', color: '#B589F6' }
                  ].map(status => (
                    <button
                      key={status.id}
                      onClick={() => setBodyStatus(status.id as any)}
                      className={`p-2 rounded-2xl border-2 transition-all ${
                        bodyStatus === status.id
                          ? 'border-2 shadow-md'
                          : 'border-gray-200 opacity-60'
                      }`}
                      style={{
                        borderColor: bodyStatus === status.id ? status.color : undefined,
                        backgroundColor: bodyStatus === status.id ? status.color + '20' : '#F9FAFB'
                      }}
                    >
                      <div className="text-xl mb-1">{status.emoji}</div>
                      <div className="text-[10px] font-bold text-gray-700">{status.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 分隔线 */}
              <div className="border-t border-gray-100"></div>

              {/* 睡觉时间 */}
              <div>
                <h4 className="font-bold text-[#2D3436] flex items-center gap-2 mb-3">
                  <Moon size={16} className="text-purple-500" />
                  睡觉时间
                </h4>
                <input
                  type="time"
                  value={bedtime}
                  onChange={(e) => setBedtime(e.target.value)}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-lg font-bold text-center outline-none focus:bg-white focus:ring-2 focus:ring-purple-200"
                />
              </div>

              {/* 收起按钮 */}
              <div className="text-center pt-2">
                <button 
                  onClick={() => setIsStatusSectionExpanded(false)}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 font-bold hover:text-gray-500 transition-colors"
                >
                  收起
                  <ChevronRight size={14} className="-rotate-90" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 生成规划按钮 */}
        <Button 
          onClick={generateSchedule}
          disabled={tasks.length === 0 || isGenerating}
          className="shadow-[0_8px_0_0_#008E72] hover:shadow-[0_6px_0_0_#008E72] hover:translate-y-[2px] active:shadow-none active:translate-y-[8px]"
          style={{ backgroundColor: '#00B894' }}
        >
          {isGenerating ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              生成中...
            </>
          ) : (
            <>
              生成 AI 规划
            </>
          )}
        </Button>
        
        {tasks.length === 0 && (
          <p className="text-xs text-gray-400 mt-3 text-center px-4">
            请先添加至少一个任务
          </p>
        )}
      </div>

      {/* 计时模式选择弹窗 */}
      {showTimerModeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-black text-[#2D2D2D] mb-4 text-center">选择计时模式</h3>
            
            {/* 模式选择 */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => confirmStartTimer('countup')}
                className="w-full p-4 rounded-2xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                  <Timer size={24} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-[#2D2D2D]">⏱️ 正计时</div>
                  <div className="text-xs text-gray-500">从0开始计时，记录实际用时</div>
                </div>
              </button>
              
              <button
                onClick={() => confirmStartTimer('countdown')}
                className="w-full p-4 rounded-2xl border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center text-white">
                  <Clock size={24} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-[#2D2D2D]">⏳ 倒计时</div>
                  <div className="text-xs text-gray-500">按计划时长 {pendingTimerTask?.duration} 分钟倒计时</div>
                </div>
              </button>
              
              <div className="p-4 rounded-2xl border-2 border-red-200 bg-red-50">
                <button
                  onClick={() => confirmStartTimer('pomodoro')}
                  className="w-full flex items-center gap-4 hover:opacity-80 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center text-white">
                    <Target size={24} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-[#2D2D2D]">🍅 番茄钟</div>
                    <div className="text-xs text-gray-500">专注与休息交替进行</div>
                  </div>
                </button>
                
                {/* 番茄钟参数设置 */}
                <div className="mt-4 pt-4 border-t border-red-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">专注时长</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPomodoroConfig(prev => ({ ...prev, workDuration: Math.max(5, prev.workDuration - 5) }))}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-bold text-[#2D2D2D]">{pomodoroConfig.workDuration}分</span>
                      <button
                        onClick={() => setPomodoroConfig(prev => ({ ...prev, workDuration: Math.min(180, prev.workDuration + 5) }))}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">休息时长</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPomodoroConfig(prev => ({ ...prev, breakDuration: Math.max(1, prev.breakDuration - 1) }))}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-bold text-[#2D2D2D]">{pomodoroConfig.breakDuration}分</span>
                      <button
                        onClick={() => setPomodoroConfig(prev => ({ ...prev, breakDuration: Math.min(30, prev.breakDuration + 1) }))}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">几轮后长休息</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPomodoroConfig(prev => ({ ...prev, rounds: Math.max(1, prev.rounds - 1) }))}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-bold text-[#2D2D2D]">{pomodoroConfig.rounds}轮</span>
                      <button
                        onClick={() => setPomodoroConfig(prev => ({ ...prev, rounds: Math.min(10, prev.rounds + 1) }))}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">长休息时长</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPomodoroConfig(prev => ({ ...prev, longBreakDuration: Math.max(5, prev.longBreakDuration - 5) }))}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-bold text-[#2D2D2D]">{pomodoroConfig.longBreakDuration}分</span>
                      <button
                        onClick={() => setPomodoroConfig(prev => ({ ...prev, longBreakDuration: Math.min(60, prev.longBreakDuration + 5) }))}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 取消按钮 */}
            <button
              onClick={() => {
                setShowTimerModeModal(false);
                setPendingTimerTask(null);
              }}
              className="w-full py-3 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-all"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 设置视图
const SettingsView = ({ 
  pomodoroSettings, 
  setPomodoroSettings,
  timeRecords,
  setTimeRecords,
  journals,
  idealTimeAllocation,
  setIdealTimeAllocation,
  globalTimers,
  setGlobalTimers
}: { 
  pomodoroSettings: PomodoroSettings;
  setPomodoroSettings: (settings: PomodoroSettings) => void;
  timeRecords: TimeRecord[];
  setTimeRecords: (records: TimeRecord[]) => void;
  journals: Journal[];
  idealTimeAllocation: Record<string, number>;
  setIdealTimeAllocation: (allocation: Record<string, number>) => void;
  globalTimers: Timer[];
  setGlobalTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
}) => {
  const [user] = useState({
    name: '治愈体验官',
    avatar: '🐱',
    phone: '+86 138****8888'
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPomodoroModal, setShowPomodoroModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDataManageModal, setShowDataManageModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showIdealTimeModal, setShowIdealTimeModal] = useState(false);
  const [showCategoryAssignModal, setShowCategoryAssignModal] = useState(false);
  const [exportType, setExportType] = useState<'journal' | 'calendar' | null>(null);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [importText, setImportText] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  
  // 时间分类配置
  const timeCategories = [
    { id: 'work', label: '工作', color: '#FF8CA1', icon: '💼' },
    { id: 'study', label: '学习', color: '#FFD23F', icon: '📚' },
    { id: 'rest', label: '休息', color: '#42D4A4', icon: '☕' },
    { id: 'sleep', label: '睡眠', color: '#6CB6FF', icon: '😴' },
    { id: 'life', label: '生活', color: '#B589F6', icon: '🏠' },
    { id: 'entertainment', label: '娱乐', color: '#FF9F1C', icon: '🎮' },
    { id: 'health', label: '健康', color: '#22d3ee', icon: '🏃' },
    { id: 'hobby', label: '兴趣', color: '#f472b6', icon: '🎨' }
  ];
  
  // 计算已分配时间
  const totalAllocatedTime = Object.values(idealTimeAllocation).reduce((sum, val) => sum + val, 0);
  
  // 调整时间分配
  const adjustTime = (categoryId: string, delta: number) => {
    const currentValue = idealTimeAllocation[categoryId];
    const newValue = Math.max(0, Math.min(24, currentValue + delta));
    const newTotal = totalAllocatedTime - currentValue + newValue;
    
    if (newTotal <= 24) {
      setIdealTimeAllocation({
        ...idealTimeAllocation,
        [categoryId]: newValue
      });
    }
  };
  
  // 滑动条调整
  const handleSliderChange = (categoryId: string, value: number) => {
    const currentValue = idealTimeAllocation[categoryId];
    const newTotal = totalAllocatedTime - currentValue + value;
    
    if (newTotal <= 24) {
      setIdealTimeAllocation({
        ...idealTimeAllocation,
        [categoryId]: value
      });
    } else {
      // 如果超过24小时，设置为最大可用值
      const maxAvailable = 24 - (totalAllocatedTime - currentValue);
      setIdealTimeAllocation({
        ...idealTimeAllocation,
        [categoryId]: Math.max(0, maxAvailable)
      });
    }
  };
  
  // 编辑数据相关状态
  const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  
  // 新增数据相关状态
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [newRecordName, setNewRecordName] = useState('');
  const [newRecordDate, setNewRecordDate] = useState('');
  const [newRecordStartTime, setNewRecordStartTime] = useState('');
  const [newRecordEndTime, setNewRecordEndTime] = useState('');

  const showToastMessage = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  const handleLogout = () => {
    // 这里可以添加登出逻辑
    setShowLogoutConfirm(false);
    // 重置到登录页面等
  };

  const exportData = () => {
    setShowExportModal(true);
    setExportType(null);
    // 默认时间范围：最近30天
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setExportEndDate(today.toISOString().split('T')[0]);
    setExportStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  };

  // 导出日记为 DOC 格式
  const exportJournalAsDoc = () => {
    // 这里使用简单的 HTML 格式，浏览器会将其识别为 Word 文档
    const startDate = new Date(exportStartDate);
    const endDate = new Date(exportEndDate);
    endDate.setHours(23, 59, 59, 999);

    // 心情映射
    const moodMap: Record<string, string> = {
      'happy': '😊 开心',
      'calm': '😌 平静',
      'sad': '😔 难过',
      'excited': '🤩 兴奋',
      'tired': '😴 疲惫'
    };

    // 使用真实日记数据
    const filteredJournals = journals.filter(j => {
      const journalDate = new Date(j.date);
      return journalDate >= startDate && journalDate <= endDate;
    });

    if (filteredJournals.length === 0) {
      showToastMessage('所选时间范围内没有日记');
      return;
    }

    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head><meta charset="utf-8"><title>我的日记</title></head>
      <body style="font-family: 'Microsoft YaHei', sans-serif;">
      <h1 style="text-align: center; color: #FF8CA1;">我的日记</h1>
      <p style="text-align: center; color: #888;">导出时间范围：${exportStartDate} 至 ${exportEndDate}</p>
      <hr/>
    `;

    filteredJournals.forEach(journal => {
      const date = new Date(journal.date);
      const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
      const moodText = journal.mood ? moodMap[journal.mood] || journal.mood : '未记录';
      
      // 生成图片HTML
      let imagesHtml = '';
      if (journal.images && journal.images.length > 0) {
        imagesHtml = `
          <div style="margin-top: 15px;">
            <p style="color: #888; font-size: 12px; margin-bottom: 8px;">📷 附带图片 (${journal.images.length}张)</p>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              ${journal.images.map((img, idx) => `
                <img 
                  src="${img}" 
                  alt="日记图片${idx + 1}" 
                  style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 1px solid #eee; object-fit: cover;"
                />
              `).join('')}
            </div>
          </div>
        `;
      }
      
      htmlContent += `
        <div style="margin: 20px 0; padding: 15px; border: 1px solid #eee; border-radius: 10px;">
          <h3 style="color: #333;">${dateStr}</h3>
          <p style="color: #666;">心情：${moodText}</p>
          <p style="color: #333; line-height: 1.8;">${journal.content}</p>
          ${imagesHtml}
        </div>
      `;
    });

    htmlContent += '</body></html>';

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `我的日记_${exportStartDate}_${exportEndDate}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToastMessage(`成功导出 ${filteredJournals.length} 篇日记`);
    setShowExportModal(false);
  };

  // 导出日历为 ICS 格式
  const exportCalendarAsIcs = () => {
    const startDate = new Date(exportStartDate);
    const endDate = new Date(exportEndDate);
    endDate.setHours(23, 59, 59, 999);

    const filteredRecords = timeRecords.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate >= startDate && recordDate <= endDate;
    });

    if (filteredRecords.length === 0) {
      showToastMessage('所选时间范围内没有日历数据');
      return;
    }

    // 生成 ICS 文件内容
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//治愈时光//Calendar Export//CN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

    filteredRecords.forEach(record => {
      const dateStr = record.date.replace(/-/g, '');
      const startTimeStr = record.startTime.replace(':', '') + '00';
      const endTimeStr = record.endTime.replace(':', '') + '00';
      const uid = `${record.id}@healingtime.app`;
      
      icsContent += `BEGIN:VEVENT
UID:${uid}
DTSTART:${dateStr}T${startTimeStr}
DTEND:${dateStr}T${endTimeStr}
SUMMARY:${record.name}
DESCRIPTION:来源: ${record.source === 'timer' ? '计时器' : '导入'}
END:VEVENT
`;
    });

    icsContent += 'END:VCALENDAR';

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `日历数据_${exportStartDate}_${exportEndDate}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToastMessage(`成功导出 ${filteredRecords.length} 条日历数据`);
    setShowExportModal(false);
  };

  // 解析文本格式的日历数据
  const parseTextData = (text: string) => {
    const lines = text.trim().split('\n');
    const records: TimeRecord[] = [];
    
    lines.forEach(line => {
      // 格式: 事件名｜开始时间｜结束时间
      const parts = line.split('｜');
      if (parts.length >= 3) {
        const startDate = new Date(parts[1].trim());
        const endDate = new Date(parts[2].trim());
        records.push({
          id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: parts[0].trim(),
          date: startDate.toISOString().split('T')[0],
          startTime: startDate.toTimeString().slice(0, 5),
          endTime: endDate.toTimeString().slice(0, 5),
          source: 'import',
          createdAt: Date.now()
        });
      }
    });
    
    return records;
  };

  // 解析 ICS 文件
  const parseICSFile = (content: string) => {
    const records: TimeRecord[] = [];
    const eventBlocks = content.split('BEGIN:VEVENT');
    
    eventBlocks.forEach(block => {
      if (block.includes('END:VEVENT')) {
        const summaryMatch = block.match(/SUMMARY[^:]*:(.+)/);
        const dtStartMatch = block.match(/DTSTART[^:]*:(\d{8}T\d{6})/);
        const dtEndMatch = block.match(/DTEND[^:]*:(\d{8}T\d{6})/);
        
        if (summaryMatch && dtStartMatch) {
          const formatICSDate = (icsDate: string) => {
            const year = icsDate.substring(0, 4);
            const month = icsDate.substring(4, 6);
            const day = icsDate.substring(6, 8);
            const hour = icsDate.substring(9, 11);
            const minute = icsDate.substring(11, 13);
            return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
          };
          
          const start = formatICSDate(dtStartMatch[1]);
          const end = dtEndMatch ? formatICSDate(dtEndMatch[1]) : start;
          
          records.push({
            id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: summaryMatch[1].trim(),
            date: start.date,
            startTime: start.time,
            endTime: end.time,
            source: 'import',
            createdAt: Date.now()
          });
        }
      }
    });
    
    return records;
  };

  // 处理文件上传 - 直接导入不展示预览
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        let newRecords: TimeRecord[] = [];
        if (file.name.endsWith('.ics')) {
          newRecords = parseICSFile(content);
        } else {
          newRecords = parseTextData(content);
        }
        if (newRecords.length > 0) {
          setTimeRecords([...timeRecords, ...newRecords]);
          showToastMessage(`导入成功，共 ${newRecords.length} 条数据`);
          setShowImportModal(false);
        } else {
          showToastMessage('未能解析到有效数据');
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  // 解析粘贴的文本并直接导入
  const handleImportText = () => {
    if (importText.trim()) {
      const newRecords = parseTextData(importText);
      if (newRecords.length > 0) {
        setTimeRecords([...timeRecords, ...newRecords]);
        showToastMessage(`导入成功，共 ${newRecords.length} 条数据`);
        setShowImportModal(false);
        setImportText('');
      } else {
        showToastMessage('未能解析到有效数据');
      }
    }
  };

  // 删除记录
  const handleDeleteRecord = (id: string) => {
    setTimeRecords(timeRecords.filter(r => r.id !== id));
    showToastMessage('删除成功');
  };

  // 开始编辑记录
  const handleStartEdit = (record: TimeRecord) => {
    setEditingRecord(record);
    setEditDate(record.date);
    setEditStartTime(record.startTime);
    setEditEndTime(record.endTime);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (editingRecord) {
      setTimeRecords(timeRecords.map(r => 
        r.id === editingRecord.id 
          ? { ...r, date: editDate, startTime: editStartTime, endTime: editEndTime }
          : r
      ));
      setEditingRecord(null);
      showToastMessage('修改成功');
    }
  };

  // 新增数据记录
  const handleAddRecord = () => {
    if (!newRecordName.trim() || !newRecordDate || !newRecordStartTime || !newRecordEndTime) {
      showToastMessage('请填写完整信息');
      return;
    }
    
    const newRecord: TimeRecord = {
      id: Date.now().toString(),
      name: newRecordName.trim(),
      date: newRecordDate,
      startTime: newRecordStartTime,
      endTime: newRecordEndTime,
      source: 'import',
      createdAt: Date.now()
    };
    
    setTimeRecords([newRecord, ...timeRecords]);
    setIsAddingRecord(false);
    setNewRecordName('');
    setNewRecordDate('');
    setNewRecordStartTime('');
    setNewRecordEndTime('');
    showToastMessage('添加成功');
  };

  // 开始新增记录
  const startAddRecord = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    setNewRecordDate(todayStr);
    setNewRecordStartTime('09:00');
    setNewRecordEndTime('10:00');
    setIsAddingRecord(true);
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #FFFEF0, #F0F8FF)' }}>
      {/* 背景装饰 */}
      <div className="absolute -right-10 top-10 w-40 h-40 rounded-full bg-yellow-100 blur-2xl opacity-50"></div>
      <div className="absolute -left-10 bottom-40 w-32 h-32 rounded-full bg-blue-100 blur-xl opacity-40"></div>
      
      {/* 头部 */}
      <div className="px-6 pt-8 pb-4 z-10">
        <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">
          PREFERENCES
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 z-10">
        {/* 用户信息 */}
        <div className="bg-gradient-to-r from-yellow-100 to-blue-50 rounded-[2rem] p-5 shadow-sm mb-6 border border-white relative overflow-hidden">
          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-yellow-200 rounded-full opacity-30 blur-xl"></div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-16 h-16 bg-white rounded-full border-4 border-yellow-50 flex items-center justify-center text-3xl shadow-lg">
              {user.avatar}
            </div>
            <div className="flex-1">
              <h3 className="font-black text-slate-700 text-lg">{user.name}</h3>
              <p className="text-yellow-600 text-xs font-bold bg-white/60 px-2 py-1 rounded-full inline-block mt-1">{user.phone}</p>
            </div>
            <button className="text-yellow-400 hover:text-yellow-600 p-2">
              <Edit3 size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/50 relative z-10">
            <div className="text-center">
              <div className="text-xl font-black text-slate-700">127</div>
              <div className="text-xs text-slate-500">专注时长(h)</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-slate-700">45</div>
              <div className="text-xs text-slate-500">完成任务</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-slate-700">12</div>
              <div className="text-xs text-slate-500">使用天数</div>
            </div>
          </div>
        </div>

        {/* AI计划番茄钟管理入口 */}
        <button 
          onClick={() => setShowPomodoroModal(true)}
          className="w-full bg-white/80 backdrop-blur-sm rounded-[2rem] p-5 shadow-sm mb-6 border-2 border-yellow-100 flex items-center justify-between hover:bg-white transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg">
              <Timer size={24} className="text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-black text-yellow-700">AI计划番茄钟管理</h3>
              <p className="text-xs text-gray-500 mt-1">
                工作{pomodoroSettings.workDuration}分钟 · 休息{pomodoroSettings.breakDuration}分钟 · {pomodoroSettings.rounds}轮后长休息
              </p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>

        {/* 理想时间配比入口 */}
        <button 
          onClick={() => setShowIdealTimeModal(true)}
          className="w-full bg-white/80 backdrop-blur-sm rounded-[2rem] p-5 shadow-sm mb-6 border-2 border-purple-100 flex items-center justify-between hover:bg-white transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg">
              <PieChart size={24} className="text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-black text-purple-700">理想时间配比</h3>
              <p className="text-xs text-gray-500 mt-1">
                已分配 {totalAllocatedTime}h / 24h
              </p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>

        {/* 数据管理 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 border border-gray-50">
          <h3 className="font-black text-[#2D2D2D] mb-4 flex items-center gap-2">
            <Shield size={20} className="text-green-500" />
            数据管理
          </h3>
          
          <div className="space-y-3">
            <button 
              onClick={() => setShowDataManageModal(true)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all"
            >
              <div className="flex items-center gap-3">
                <Database size={18} className="text-blue-500" />
                <div>
                  <span className="text-sm font-bold text-gray-700">管理数据</span>
                  <span className="text-xs text-gray-400 ml-2">共 {timeRecords.length} 条</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
            
            <button 
              onClick={() => setShowCategoryAssignModal(true)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all"
            >
              <div className="flex items-center gap-3">
                <ListTodo size={18} className="text-purple-500" />
                <div>
                  <span className="text-sm font-bold text-gray-700">分类归属</span>
                  <span className="text-xs text-gray-400 ml-2">管理事件分类</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
            
            <button 
              onClick={exportData}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all"
            >
              <div className="flex items-center gap-3">
                <Download size={18} className="text-gray-600" />
                <span className="text-sm font-bold text-gray-700">导出数据</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
            
            <button 
              onClick={() => setShowImportModal(true)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all"
            >
              <div className="flex items-center gap-3">
                <Upload size={18} className="text-gray-600" />
                <span className="text-sm font-bold text-gray-700">导入数据</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* 退出登录 */}
        <button 
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full bg-red-50 border-2 border-red-100 rounded-3xl p-4 flex items-center justify-center gap-2 text-red-500 font-bold hover:bg-red-100 transition-all"
        >
          <LogOut size={20} />
          退出登录
        </button>
      </div>

      {/* 退出确认弹窗 */}
      {showLogoutConfirm && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white w-[85%] rounded-3xl p-6 shadow-2xl animate-scale-in">
            <h3 className="text-xl font-black text-[#2D2D2D] mb-2 text-center">确认退出</h3>
            <p className="text-gray-500 text-sm mb-6 text-center">
              退出后需要重新登录，确定要退出吗？
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button 
                onClick={handleLogout}
                className="flex-1"
                style={{ backgroundColor: '#FF8CA1' }}
              >
                确认退出
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI计划番茄钟设置弹窗 */}
      {showPomodoroModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white w-[90%] rounded-[2rem] p-6 shadow-2xl animate-scale-in max-h-[80%] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-yellow-700 flex items-center gap-2">
                <Timer size={24} className="text-red-500" />
                AI计划番茄钟管理
              </h3>
              <button 
                onClick={() => setShowPomodoroModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-600">工作时长</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setPomodoroSettings({...pomodoroSettings, workDuration: Math.max(5, pomodoroSettings.workDuration - 5)})}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-[#2D2D2D] w-12 text-center">
                    {pomodoroSettings.workDuration}
                  </span>
                  <button 
                    onClick={() => setPomodoroSettings({...pomodoroSettings, workDuration: Math.min(60, pomodoroSettings.workDuration + 5)})}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500 w-8">分钟</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-600">休息时长</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setPomodoroSettings({...pomodoroSettings, breakDuration: Math.max(1, pomodoroSettings.breakDuration - 1)})}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-[#2D2D2D] w-12 text-center">
                    {pomodoroSettings.breakDuration}
                  </span>
                  <button 
                    onClick={() => setPomodoroSettings({...pomodoroSettings, breakDuration: Math.min(30, pomodoroSettings.breakDuration + 1)})}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500 w-8">分钟</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-600">长休息间隔</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setPomodoroSettings({...pomodoroSettings, rounds: Math.max(2, pomodoroSettings.rounds - 1)})}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-[#2D2D2D] w-12 text-center">
                    {pomodoroSettings.rounds}
                  </span>
                  <button 
                    onClick={() => setPomodoroSettings({...pomodoroSettings, rounds: Math.min(8, pomodoroSettings.rounds + 1)})}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500 w-8">轮</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-600">长休息时长</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setPomodoroSettings({...pomodoroSettings, longBreakDuration: Math.max(5, pomodoroSettings.longBreakDuration - 5)})}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-[#2D2D2D] w-12 text-center">
                    {pomodoroSettings.longBreakDuration}
                  </span>
                  <button 
                    onClick={() => setPomodoroSettings({...pomodoroSettings, longBreakDuration: Math.min(60, pomodoroSettings.longBreakDuration + 5)})}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500 w-8">分钟</span>
                </div>
              </div>

              {/* 番茄钟说明 */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-4 mt-4">
                <p className="text-sm text-red-500 font-medium leading-relaxed">
                  🍅 每完成 {pomodoroSettings.rounds} 轮（{pomodoroSettings.workDuration}分钟工作 + {pomodoroSettings.breakDuration}分钟休息）后，进入 {pomodoroSettings.longBreakDuration} 分钟长休息
                </p>
              </div>

              <Button 
                onClick={() => setShowPomodoroModal(false)}
                className="mt-4"
                style={{ backgroundColor: '#FF8CA1' }}
              >
                完成设置
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 导入数据弹窗 - 简化版 */}
      {showImportModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white w-[90%] rounded-[2rem] p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-[#2D2D2D]">导入日历数据</h3>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* 上传文件 */}
            <div className="mb-4">
              <label className="text-sm font-bold text-gray-600 block mb-2">上传 ICS 文件</label>
              <input
                type="file"
                accept=".ics,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="import-file"
              />
              <label 
                htmlFor="import-file"
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:border-gray-400 hover:text-gray-600 cursor-pointer transition-all"
              >
                <Upload size={18} />
                点击选择文件
              </label>
            </div>

            {/* 或者分隔线 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-xs text-gray-400">或者</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* 粘贴文本 */}
            <div className="mb-4">
              <label className="text-sm font-bold text-gray-600 block mb-2">粘贴日历数据</label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="格式：事件名｜开始时间｜结束时间&#10;例如：睡觉｜2025-12-20T00:45:00+08:00｜2025-12-20T15:30:00+08:00"
                className="w-full h-24 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 resize-none"
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                }}
                className="flex-1"
              >
                取消
              </Button>
              <Button 
                onClick={handleImportText}
                disabled={!importText.trim()}
                className="flex-1"
                style={{ backgroundColor: '#42D4A4' }}
              >
                导入
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 数据管理弹窗 */}
      {showDataManageModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white w-[95%] rounded-[2rem] p-5 shadow-2xl animate-scale-in max-h-[85%] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-[#2D2D2D]">管理数据</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={startAddRecord}
                  className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 hover:bg-green-200"
                >
                  <Plus size={18} />
                </button>
                <button 
                  onClick={() => {
                    setShowDataManageModal(false);
                    setEditingRecord(null);
                    setIsAddingRecord(false);
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* 新增数据表单 */}
            {isAddingRecord && (
              <div className="bg-green-50 rounded-2xl p-4 border-2 border-green-200 mb-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 w-12">名称</label>
                    <input
                      type="text"
                      value={newRecordName}
                      onChange={(e) => setNewRecordName(e.target.value)}
                      placeholder="输入事项名称..."
                      className="flex-1 bg-white rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-green-300"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 w-12">日期</label>
                    <input
                      type="date"
                      value={newRecordDate}
                      onChange={(e) => setNewRecordDate(e.target.value)}
                      className="flex-1 bg-white rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-green-300"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 w-12">开始</label>
                    <input
                      type="time"
                      value={newRecordStartTime}
                      onChange={(e) => setNewRecordStartTime(e.target.value)}
                      className="flex-1 bg-white rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-green-300"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 w-12">结束</label>
                    <input
                      type="time"
                      value={newRecordEndTime}
                      onChange={(e) => setNewRecordEndTime(e.target.value)}
                      className="flex-1 bg-white rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-green-300"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setIsAddingRecord(false)}
                      className="flex-1 py-2 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAddRecord}
                      className="flex-1 py-2 text-sm font-bold text-white bg-green-500 rounded-xl hover:bg-green-600"
                    >
                      添加
                    </button>
                  </div>
                </div>
              </div>
            )}

            {timeRecords.length === 0 && !isAddingRecord ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10">
                <Database size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-400 text-sm">暂无数据记录</p>
                <p className="text-gray-300 text-xs mt-1">点击右上角 + 手动添加数据</p>
              </div>
            ) : (
              <div 
                className="flex-1 overflow-y-auto"
                ref={(el) => {
                  if (el && timeRecords.length > 0) {
                    // 找到距离当前时间最近的记录
                    const now = new Date();
                    
                    const sortedRecords = [...timeRecords].sort((a, b) => {
                      const aDateTime = `${a.date} ${a.startTime}`;
                      const bDateTime = `${b.date} ${b.startTime}`;
                      return aDateTime.localeCompare(bDateTime);
                    });
                    
                    let closestIndex = 0;
                    let minDiff = Infinity;
                    sortedRecords.forEach((record, index) => {
                      const recordDateTime = new Date(`${record.date}T${record.startTime}`).getTime();
                      const diff = Math.abs(recordDateTime - now.getTime());
                      if (diff < minDiff) {
                        minDiff = diff;
                        closestIndex = index;
                      }
                    });
                    
                    // 计算需要滚动的位置（考虑日期标题）
                    const closestDate = sortedRecords[closestIndex]?.date;
                    const dateElement = el.querySelector(`[data-date="${closestDate}"]`);
                    if (dateElement) {
                      setTimeout(() => {
                        dateElement.scrollIntoView({ block: 'start' });
                      }, 100);
                    }
                  }
                }}
              >
                {(() => {
                  // 按日期分组
                  const sortedRecords = [...timeRecords].sort((a, b) => {
                    const aDateTime = `${a.date} ${a.startTime}`;
                    const bDateTime = `${b.date} ${b.startTime}`;
                    return aDateTime.localeCompare(bDateTime);
                  });
                  
                  const groupedByDate: Record<string, TimeRecord[]> = {};
                  sortedRecords.forEach(record => {
                    if (!groupedByDate[record.date]) {
                      groupedByDate[record.date] = [];
                    }
                    groupedByDate[record.date].push(record);
                  });
                  
                  const dates = Object.keys(groupedByDate).sort();
                  
                  return dates.map(date => (
                    <div key={date} data-date={date} className="mb-4">
                      {/* 日期标题 */}
                      <div className="sticky top-0 bg-white/95 backdrop-blur-sm py-2 px-1 z-10">
                        <span className="text-sm font-bold text-gray-600">
                          {(() => {
                            const d = new Date(date);
                            const today = new Date();
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);
                            
                            const isToday = date === `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                            const isYesterday = date === `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;
                            
                            const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                            const weekday = weekdays[d.getDay()];
                            
                            if (isToday) return `今天 · ${d.getMonth() + 1}月${d.getDate()}日 ${weekday}`;
                            if (isYesterday) return `昨天 · ${d.getMonth() + 1}月${d.getDate()}日 ${weekday}`;
                            return `${d.getMonth() + 1}月${d.getDate()}日 ${weekday}`;
                          })()}
                        </span>
                      </div>
                      
                      {/* 该日期下的记录 */}
                      <div className="space-y-2">
                        {groupedByDate[date].map(record => (
                          <div key={record.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    {editingRecord?.id === record.id ? (
                      // 编辑模式
                      <div className="space-y-3">
                        <div className="font-bold text-gray-700">{record.name}</div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 w-12">日期</label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="flex-1 bg-white rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-blue-300"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 w-12">开始</label>
                          <input
                            type="time"
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            className="flex-1 bg-white rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-blue-300"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 w-12">结束</label>
                          <input
                            type="time"
                            value={editEndTime}
                            onChange={(e) => setEditEndTime(e.target.value)}
                            className="flex-1 bg-white rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-blue-300"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => setEditingRecord(null)}
                            className="flex-1 py-2 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200"
                          >
                            取消
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="flex-1 py-2 text-sm font-bold text-white bg-blue-500 rounded-xl hover:bg-blue-600"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 显示模式
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700">{record.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              record.source === 'timer' 
                                ? 'bg-purple-100 text-purple-600' 
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              {record.source === 'timer' ? '计时器' : '导入'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {record.startTime} - {record.endTime}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(record)}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 分类归属弹窗 */}
      {showCategoryAssignModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white w-[95%] rounded-[2rem] p-5 shadow-2xl animate-scale-in max-h-[85%] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-[#2D2D2D]">分类归属</h3>
              <button 
                onClick={() => setShowCategoryAssignModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>
            
            <p className="text-xs text-gray-400 mb-4">修改事件分类后，将同步更新复盘数据和专注页面</p>

            {(() => {
              // 按名称去重获取唯一事件
              const uniqueEvents = Array.from(
                new Map(
                  [...timeRecords, ...globalTimers.map(t => ({ 
                    id: t.id, 
                    name: t.name, 
                    categoryId: t.categoryId 
                  }))]
                  .map(item => [item.name, item])
                ).values()
              ).sort((a: any, b: any) => {
                // 待分类的排在前面
                const aUncategorized = !a.categoryId || a.categoryId === 'uncategorized';
                const bUncategorized = !b.categoryId || b.categoryId === 'uncategorized';
                if (aUncategorized && !bUncategorized) return -1;
                if (!aUncategorized && bUncategorized) return 1;
                return a.name.localeCompare(b.name);
              });
              
              if (uniqueEvents.length === 0) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center py-10">
                    <ListTodo size={48} className="text-gray-300 mb-4" />
                    <p className="text-gray-400 text-sm">暂无事件</p>
                    <p className="text-gray-300 text-xs mt-1">使用计时器后会显示在这里</p>
                  </div>
                );
              }
              
              return (
                <div className="flex-1 overflow-y-auto space-y-3">
                  {uniqueEvents.map((event: any) => {
                    const currentCategory = timeCategories.find(c => c.id === event.categoryId) || 
                      { id: 'uncategorized', label: '待分类', color: '#9ca3af', icon: '📁' };
                    
                    return (
                      <div key={event.name} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{currentCategory.icon}</span>
                            <span className="font-bold text-gray-700">{event.name}</span>
                          </div>
                          <select
                            value={event.categoryId || 'uncategorized'}
                            onChange={(e) => {
                              const newCategoryId = e.target.value as CategoryId;
                              const eventName = event.name;
                              
                              // 更新所有同名的timeRecords
                              setTimeRecords(timeRecords.map(r => 
                                r.name === eventName ? { ...r, categoryId: newCategoryId } : r
                              ));
                              
                              // 更新所有同名的globalTimers
                              setGlobalTimers(prev => prev.map(t => 
                                t.name === eventName ? { ...t, categoryId: newCategoryId } : t
                              ));
                            }}
                            className="bg-white border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-purple-300"
                          >
                            <option value="uncategorized">📁 待分类</option>
                            {timeCategories.map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.icon} {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 导出数据弹窗 */}
      {showExportModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white w-[90%] rounded-[2rem] p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-[#2D2D2D]">导出数据</h3>
              <button 
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            {!exportType ? (
              // 选择导出类型
              <div className="space-y-3">
                <button
                  onClick={() => setExportType('journal')}
                  className="w-full p-4 rounded-2xl border-2 border-gray-100 hover:border-pink-200 hover:bg-pink-50 transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center">
                    <BookHeart size={24} className="text-pink-500" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-700">导出日记</div>
                    <div className="text-xs text-gray-400">导出为 DOC 格式</div>
                  </div>
                </button>
                
                <button
                  onClick={() => setExportType('calendar')}
                  className="w-full p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <Calendar size={24} className="text-blue-500" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-700">导出日历</div>
                    <div className="text-xs text-gray-400">导出为 ICS 格式</div>
                  </div>
                </button>
              </div>
            ) : (
              // 选择时间范围
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setExportType(null)}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <ChevronLeft size={20} className="text-gray-500" />
                  </button>
                  <span className="font-bold text-gray-700">
                    {exportType === 'journal' ? '导出日记' : '导出日历'}
                  </span>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-600 block mb-2">开始日期</label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-600 block mb-2">结束日期</label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* 快捷选择 */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: '最近7天', days: 7 },
                    { label: '最近30天', days: 30 },
                    { label: '最近90天', days: 90 },
                    { label: '全部', days: 365 * 10 }
                  ].map(option => (
                    <button
                      key={option.days}
                      onClick={() => {
                        const today = new Date();
                        const startDate = new Date(today.getTime() - option.days * 24 * 60 * 60 * 1000);
                        setExportEndDate(today.toISOString().split('T')[0]);
                        setExportStartDate(startDate.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <Button 
                  onClick={exportType === 'journal' ? exportJournalAsDoc : exportCalendarAsIcs}
                  className="mt-4"
                  style={{ backgroundColor: exportType === 'journal' ? '#f472b6' : '#60a5fa' }}
                >
                  <Download size={18} />
                  确认导出
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 理想时间配比弹窗 */}
      {showIdealTimeModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white w-[95%] h-[90%] rounded-[2rem] shadow-2xl animate-scale-in flex flex-col overflow-hidden">
            {/* 悬浮置顶的已分配时间提示 */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowIdealTimeModal(false)}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
                >
                  <ChevronLeft size={20} />
                </button>
                <h3 className="text-lg font-black text-white">理想时间配比</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-4 py-2 rounded-full font-black text-sm ${
                  totalAllocatedTime === 24 
                    ? 'bg-green-400 text-white' 
                    : totalAllocatedTime > 24 
                      ? 'bg-red-400 text-white' 
                      : 'bg-white/90 text-purple-600'
                }`}>
                  {totalAllocatedTime}h / 24h
                </div>
              </div>
            </div>

            {/* 进度条总览 */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
                {timeCategories.map(cat => {
                  const hours = idealTimeAllocation[cat.id];
                  const percentage = (hours / 24) * 100;
                  return percentage > 0 ? (
                    <div 
                      key={cat.id}
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${percentage}%`, 
                        backgroundColor: cat.color 
                      }}
                      title={`${cat.label}: ${hours}h`}
                    />
                  ) : null;
                })}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {timeCategories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-1 text-xs text-gray-500">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 分类列表 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {timeCategories.map(cat => {
                const hours = idealTimeAllocation[cat.id];
                const maxAvailable = 24 - totalAllocatedTime + hours;
                
                return (
                  <div 
                    key={cat.id} 
                    className="bg-white rounded-2xl p-4 border-2 border-gray-100 hover:border-gray-200 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: cat.color + '20' }}
                        >
                          {cat.icon}
                        </div>
                        <div>
                          <span className="font-bold text-gray-700">{cat.label}</span>
                          <div className="text-xs text-gray-400">
                            {hours > 0 ? `${Math.floor(hours)}小时${hours % 1 === 0.5 ? '30分钟' : ''}` : '未分配'}
                          </div>
                        </div>
                      </div>
                      <div 
                        className="text-2xl font-black"
                        style={{ color: cat.color }}
                      >
                        {hours}h
                      </div>
                    </div>
                    
                    {/* 滑动条和加减按钮 */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => adjustTime(cat.id, -0.5)}
                        disabled={hours <= 0}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg transition-all active:scale-90"
                      >
                        −
                      </button>
                      
                      <div className="flex-1 relative">
                        <input
                          type="range"
                          min="0"
                          max={maxAvailable}
                          step="0.5"
                          value={hours}
                          onChange={(e) => handleSliderChange(cat.id, parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, ${cat.color} 0%, ${cat.color} ${(hours / maxAvailable) * 100}%, #e5e7eb ${(hours / maxAvailable) * 100}%, #e5e7eb 100%)`
                          }}
                        />
                        {/* 刻度标记 */}
                        <div className="flex justify-between mt-1 px-1">
                          <span className="text-[10px] text-gray-300">0</span>
                          <span className="text-[10px] text-gray-300">{Math.floor(maxAvailable / 2)}h</span>
                          <span className="text-[10px] text-gray-300">{maxAvailable}h</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => adjustTime(cat.id, 0.5)}
                        disabled={totalAllocatedTime >= 24}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg transition-all active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 底部操作栏 */}
            <div className="px-6 py-4 bg-white border-t border-gray-100">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIdealTimeAllocation({
                      work: 8,
                      study: 2,
                      rest: 1,
                      sleep: 7,
                      life: 2,
                      entertainment: 2,
                      health: 1,
                      hobby: 1
                    });
                  }}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
                >
                  重置默认
                </button>
                <button
                  onClick={() => {
                    setShowIdealTimeModal(false);
                    showToastMessage('时间配比已保存');
                  }}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:opacity-90 transition-all"
                >
                  保存设置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast 提示 */}
      <Toast message={toastMessage} visible={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
};

// 主应用组件
export default function App() {
  // 临时隐藏登录和新手引导，直接进入主界面
  // 原始值: 'login' (需要恢复时改回来)
  const [appState, setAppState] = useState<'login' | 'onboarding' | 'main'>('main');
  const [activeTab, setActiveTab] = useState<TabId>('plan');
  // 原始值: true (需要恢复时改回来)
  const [isFirstTime, setIsFirstTime] = useState(false); // 模拟首次使用
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('work'); // 添加全局分类状态
  
  // 全局番茄钟设置
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>({
    workDuration: 25,
    breakDuration: 5,
    rounds: 4,
    longBreakDuration: 15
  });

  // 全局时间记录数据 - 持久化到localStorage
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>(() => {
    const saved = localStorage.getItem('timeRecords');
    return saved ? JSON.parse(saved) : [];
  });

  // 全局计时器数据（专注页面使用）- 持久化到localStorage
  const [globalTimers, setGlobalTimers] = useState<Timer[]>(() => {
    const saved = localStorage.getItem('globalTimers');
    return saved ? JSON.parse(saved) : [];
  });

  // 持久化timeRecords到localStorage
  useEffect(() => {
    localStorage.setItem('timeRecords', JSON.stringify(timeRecords));
  }, [timeRecords]);

  // 持久化globalTimers到localStorage
  useEffect(() => {
    localStorage.setItem('globalTimers', JSON.stringify(globalTimers));
  }, [globalTimers]);

  // 全局日记数据
  const [journals, setJournals] = useState<Journal[]>([
    {
      id: '1',
      date: Date.now() - 86400000, // 昨天
      mood: 'happy',
      content: '今天完成了一个重要的项目，感觉很有成就感！虽然过程中遇到了一些困难，但最终都克服了。',
      images: []
    }
  ]);

  // PlanView 持久化状态 - 切换tab时保留，并持久化到localStorage
  const [planStep, setPlanStep] = useState<'setup' | 'generating' | 'schedule'>(() => {
    const saved = localStorage.getItem('planStep');
    // 如果之前是generating状态，恢复为setup（因为生成过程不能恢复）
    if (saved === 'generating') return 'setup';
    return (saved as 'setup' | 'schedule') || 'setup';
  });
  const [planScheduleData, setPlanScheduleData] = useState<any>(() => {
    const saved = localStorage.getItem('planScheduleData');
    return saved ? JSON.parse(saved) : null;
  });
  const [planTasks, setPlanTasks] = useState<Array<{id: string, name: string, duration: number}>>(() => {
    const saved = localStorage.getItem('planTasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [planBedtime, setPlanBedtime] = useState('00:00');
  
  // 根据当前时间计算智能默认生活状态
  const getDefaultLifestyle = () => {
    const now = new Date();
    const currentHour = now.getHours();
    return {
      morningWash: currentHour >= 7,
      breakfast: currentHour >= 9,
      lunch: currentHour >= 14,
      dinner: currentHour >= 19,
      nightWash: false
    };
  };
  
  const [planLifestyle, setPlanLifestyle] = useState(getDefaultLifestyle);
  const [planMentalStatus, setPlanMentalStatus] = useState<'energetic' | 'normal' | 'tired' | 'anxious' | 'nervous' | 'sad' | 'angry'>('normal');
  const [planBodyStatus, setPlanBodyStatus] = useState<'good' | 'backPain' | 'headache' | 'periodPain' | 'wristPain'>('good');
  const [planNewTaskName, setPlanNewTaskName] = useState('');
  const [planNewTaskDuration, setPlanNewTaskDuration] = useState(25);

  // 持久化planStep和planScheduleData到localStorage
  useEffect(() => {
    localStorage.setItem('planStep', planStep);
  }, [planStep]);

  useEffect(() => {
    if (planScheduleData) {
      localStorage.setItem('planScheduleData', JSON.stringify(planScheduleData));
    } else {
      localStorage.removeItem('planScheduleData');
    }
  }, [planScheduleData]);

  useEffect(() => {
    localStorage.setItem('planTasks', JSON.stringify(planTasks));
  }, [planTasks]);

  useEffect(() => {
    localStorage.setItem('planBedtime', planBedtime);
  }, [planBedtime]);

  useEffect(() => {
    localStorage.setItem('planLifestyle', JSON.stringify(planLifestyle));
  }, [planLifestyle]);

  useEffect(() => {
    localStorage.setItem('planMentalStatus', planMentalStatus);
  }, [planMentalStatus]);

  useEffect(() => {
    localStorage.setItem('planBodyStatus', planBodyStatus);
  }, [planBodyStatus]);

  // 全局理想时间配比状态
  const [idealTimeAllocation, setIdealTimeAllocation] = useState<Record<string, number>>({
    work: 8,
    study: 2,
    rest: 1,
    sleep: 7,
    life: 2,
    entertainment: 2,
    health: 1,
    hobby: 1
  });
  const handleLogin = () => {
    if (isFirstTime) {
      setAppState('onboarding');
    } else {
      setAppState('main');
    }
  };

  const handleOnboardingComplete = () => {
    setIsFirstTime(false);
    setAppState('main');
  };

  const renderView = () => {
    switch (activeTab) {
      case 'timer': return <TimerView selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} timeRecords={timeRecords} setTimeRecords={setTimeRecords} globalTimers={globalTimers} setGlobalTimers={setGlobalTimers} />;
      case 'journal': return <JournalView journals={journals} setJournals={setJournals} />;
      case 'review': return <ReviewView journals={journals} timeRecords={timeRecords} idealTimeAllocation={idealTimeAllocation} />;
      case 'plan': return <PlanView 
        pomodoroSettings={pomodoroSettings} 
        step={planStep} 
        setStep={setPlanStep} 
        scheduleData={planScheduleData} 
        setScheduleData={setPlanScheduleData}
        tasks={planTasks}
        setTasks={setPlanTasks}
        bedtime={planBedtime}
        setBedtime={setPlanBedtime}
        lifestyle={planLifestyle}
        setLifestyle={setPlanLifestyle}
        mentalStatus={planMentalStatus}
        setMentalStatus={setPlanMentalStatus}
        bodyStatus={planBodyStatus}
        setBodyStatus={setPlanBodyStatus}
        newTaskName={planNewTaskName}
        setNewTaskName={setPlanNewTaskName}
        newTaskDuration={planNewTaskDuration}
        setNewTaskDuration={setPlanNewTaskDuration}
        timeRecords={timeRecords}
        setTimeRecords={setTimeRecords}
        globalTimers={globalTimers}
        setGlobalTimers={setGlobalTimers}
      />;
      case 'settings': return <SettingsView pomodoroSettings={pomodoroSettings} setPomodoroSettings={setPomodoroSettings} timeRecords={timeRecords} setTimeRecords={setTimeRecords} journals={journals} idealTimeAllocation={idealTimeAllocation} setIdealTimeAllocation={setIdealTimeAllocation} globalTimers={globalTimers} setGlobalTimers={setGlobalTimers} />;
      default: return <TimerView selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} timeRecords={timeRecords} setTimeRecords={setTimeRecords} globalTimers={globalTimers} setGlobalTimers={setGlobalTimers} />;
    }
  };

  const tabs: { id: TabId; icon: typeof Timer; label: string; color: string }[] = [
    { id: 'plan', icon: Calendar, label: '规划', color: MACARON_COLORS.themes.plan },
    { id: 'review', icon: PieChart, label: '复盘', color: MACARON_COLORS.themes.review },
    { id: 'timer', icon: Timer, label: '专注', color: MACARON_COLORS.categories[selectedCategory]?.primary || MACARON_COLORS.themes.timer },
    { id: 'journal', icon: BookHeart, label: '日记', color: MACARON_COLORS.themes.journal },
    { id: 'settings', icon: Settings2, label: '设置', color: MACARON_COLORS.themes.settings },
  ];

  if (appState === 'login') {
    return (
      <div className="iphone-container bg-white overflow-hidden mx-auto">
        <div className="flex-1 h-full">
          <LoginView onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  if (appState === 'onboarding') {
    return (
      <div className="iphone-container bg-white overflow-hidden mx-auto">
        <div className="flex-1 h-full">
          <OnboardingView onComplete={handleOnboardingComplete} />
        </div>
      </div>
    );
  }

  // 动态渐变背景
  const gradientMap: Record<string, string> = {
    plan: 'linear-gradient(to bottom right, #E8F5E9, #E8F5E9)',
    timer: 'linear-gradient(to bottom right, #faf5ff, #ffffff, #ecfeff)',
    journal: 'linear-gradient(to bottom right, #fdf2f8, #ffffff, #f7fee7)',
    review: 'linear-gradient(to bottom right, #f0f9ff, #ffffff, #fff1f2)',
    settings: 'linear-gradient(to bottom right, #fefce8, #ffffff, #eff6ff)',
  };
  const currentGradient = gradientMap[activeTab] || gradientMap.plan;

  return (
    <>
      {/* 第一步：独立背景层 - fixed inset-0 z-0 无脑铺满整个物理屏幕 */}
      <div 
        className="fixed inset-0 z-0 transition-all duration-700"
        style={{ background: currentGradient }}
      />
      
      {/* 第二步：内容层悬浮在背景层之上 */}
      <div className="iphone-container relative z-10 bg-transparent mx-auto h-full flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* 主内容区域 - flex-1 占满剩余空间，overflow-y-auto 允许滚动 */}
      <div className="flex-1 overflow-y-auto pb-24">
        {renderView()}
      </div>
      
      {/* 底部导航栏 - 固定在屏幕底部 */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-24 bg-white rounded-t-[2.5rem] border-t border-gray-100 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-full items-center justify-around px-4">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex flex-col items-center justify-center w-16 h-full relative group"
                >
                  {/* 选中时的脉冲光晕 */}
                  {isActive && (
                    <span 
                      className="absolute top-2 w-10 h-10 rounded-full opacity-40 animate-ping"
                      style={{ backgroundColor: tab.color + '30' }}
                    />
                  )}
                  <div 
                    className={`p-3 rounded-2xl transition-all duration-500 ${
                      isActive 
                        ? 'bg-white shadow-md -translate-y-3 scale-110 ring-4 ring-white' 
                        : 'hover:bg-white/40'
                    }`}
                  >
                    <Icon 
                      size={24} 
                      className="transition-colors duration-300"
                      style={{ color: isActive ? tab.color : '#94a3b8' }}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  <span 
                    className={`text-[11px] font-bold mt-1 transition-all duration-300 ${
                      isActive ? '-translate-y-2' : 'translate-y-0'
                    }`}
                    style={{ color: isActive ? tab.color : '#94a3b8' }}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}