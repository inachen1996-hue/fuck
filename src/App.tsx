import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Timer, BookHeart, PieChart, Calendar, Settings2, 
  Plus, Heart, Play, Clock, Smartphone, ChevronRight,
  ArrowRight, Sparkles, Target, Coffee, Zap,
  Edit3, X, Camera, ChevronLeft, Check,
  RefreshCw, Brain, Lightbulb,
  ListTodo, Moon, Utensils,
  Download, Upload, Trash2, Database, Search
} from 'lucide-react';

// 原始标签页标题
const ORIGINAL_TITLE = '治愈时光';

// 格式化时间为 mm:ss 或 hh:mm:ss
const formatTimeForTitle = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 更新标签页标题
const updateDocumentTitle = (
  timerName: string | null,
  timeValue: number,
  mode: 'countdown' | 'countup' | 'pomodoro',
  pomodoroPhase?: 'work' | 'break' | 'longBreak',
  isRunning?: boolean
) => {
  if (!timerName || !isRunning) {
    document.title = ORIGINAL_TITLE;
    return;
  }
  
  const timeStr = formatTimeForTitle(timeValue);
  let prefix = '';
  
  if (mode === 'pomodoro') {
    if (pomodoroPhase === 'work') {
      prefix = '🍅 ';
    } else if (pomodoroPhase === 'break') {
      prefix = '☕ ';
    } else {
      prefix = '🌴 ';
    }
  } else if (mode === 'countdown') {
    prefix = '⏳ ';
  } else {
    prefix = '⏱️ ';
  }
  
  document.title = `${prefix}${timeStr} - ${timerName}`;
};

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
  source: 'timer' | 'import' | 'manual';  // 数据来源
  categoryId?: CategoryId;
  createdAt: number;
}

// 持久化计时器状态接口 - 用于页面关闭后恢复计时器
interface PersistentTimerState {
  // 专注页面计时器
  focusTimer: {
    activeTimerId: string | null;
    timerMode: 'countdown' | 'countup' | 'pomodoro';
    timerDuration?: number;         // 倒计时时长（分钟）
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
    countdownDuration?: number;     // 倒计时时长（分钟）
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

// 移除emoji的辅助函数（用于名称比较）
const removeEmoji = (str: string) => {
  return str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu, '').trim();
};

// 根据事项名称查找已有的分类（从 timeRecords 和 globalTimers 中查找）
const findExistingCategory = (
  name: string,
  timeRecords: TimeRecord[],
  globalTimers: Timer[]
): CategoryId => {
  const normalizedName = removeEmoji(name);
  
  // 先从 globalTimers 中查找（优先级更高，因为用户可能在专注页面手动分类过）
  for (const timer of globalTimers) {
    if (removeEmoji(timer.name) === normalizedName && timer.categoryId && timer.categoryId !== 'uncategorized') {
      return timer.categoryId;
    }
  }
  
  // 再从 timeRecords 中查找
  for (const record of timeRecords) {
    if (removeEmoji(record.name) === normalizedName && record.categoryId && record.categoryId !== 'uncategorized') {
      return record.categoryId;
    }
  }
  
  // 没找到则返回待分类
  return 'uncategorized';
};

// 默认铃声文件路径
const DEFAULT_ALARM_SOUND = '/滴滴滴.MP3';

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

// 全局音频状态
let audioElement: HTMLAudioElement | null = null;
let audioUnlocked = false;
let stopTimeoutId: number | null = null;

// 铃声播放器 - 简化版，专注于移动端兼容性
const alarmPlayer = {
  // 获取或创建 audio 元素
  getAudio(): HTMLAudioElement {
    if (!audioElement) {
      audioElement = new Audio();
      audioElement.loop = true;
      audioElement.volume = 1.0;
      audioElement.preload = 'auto';
      audioElement.src = DEFAULT_ALARM_SOUND;
      // 添加到 DOM（某些浏览器需要）
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
    }
    return audioElement;
  },
  
  // 解锁音频 - 必须在用户点击事件中直接调用（静默解锁，不播放声音）
  async unlock(): Promise<boolean> {
    // 如果已经解锁，直接返回
    if (audioUnlocked) {
      return true;
    }
    
    const audio = this.getAudio();
    audio.src = DEFAULT_ALARM_SOUND;
    
    try {
      // 关键：在用户交互中直接调用 play()，但静音播放
      audio.currentTime = 0;
      audio.volume = 0; // 静音
      audio.muted = true; // 双重保险
      audio.loop = false; // 确保不循环
      
      await audio.play();
      
      // 立即停止
      audio.pause();
      audio.currentTime = 0;
      audio.loop = true; // 恢复循环设置
      
      // 恢复音量设置
      audio.volume = 1.0;
      audio.muted = false;
      
      // 标记为已解锁
      audioUnlocked = true;
      console.log('音频解锁成功！');
      
      return true;
    } catch (err) {
      console.error('音频解锁失败:', err);
      // 尝试静音播放
      try {
        audio.muted = true;
        audio.volume = 0;
        audio.loop = false;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.loop = true;
        audio.muted = false;
        audio.volume = 1.0;
        audioUnlocked = true;
        console.log('静音解锁成功');
        return true;
      } catch (e) {
        console.error('静音解锁也失败:', e);
        return false;
      }
    }
  },
  
  // 播放铃声
  async play(duration: number = 10000) {
    // 先清理之前的状态
    if (stopTimeoutId) {
      clearTimeout(stopTimeoutId);
      stopTimeoutId = null;
    }
    
    // 振动
    if ('vibrate' in navigator) {
      const pattern = [200, 100, 200, 100, 200, 100, 200, 100, 200, 100, 200, 100, 200, 100, 200, 100, 200, 100, 200];
      navigator.vibrate(pattern);
    }
    
    const audio = this.getAudio();
    
    // 重新设置音频属性
    audio.src = DEFAULT_ALARM_SOUND;
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.loop = true;
    
    // 尝试播放
    try {
      await audio.play();
      console.log('铃声开始播放');
    } catch (err) {
      console.error('播放失败:', err);
    }
    
    // 设置自动停止
    stopTimeoutId = window.setTimeout(() => {
      this.stop();
    }, duration);
  },
  
  // 停止播放
  stop() {
    // 停止 audio 元素
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    
    if (stopTimeoutId) {
      clearTimeout(stopTimeoutId);
      stopTimeoutId = null;
    }
    
    // 停止振动
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
    
    console.log('铃声已停止');
  },
  
  // 检查是否正在播放
  isPlaying() {
    return audioElement && !audioElement.paused;
  },
  
  // 检查是否已解锁
  isUnlocked() {
    return audioUnlocked;
  }
};

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
    journal: '#CFA0E9',  // 淡紫色
    review: '#89CFF0',   // 天空蓝
    plan: '#B066F5',     // 紫色
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
    journal: 'linear-gradient(135deg, #E0C3FC 0%, #CFA0E9 100%)',
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
  timeRecords: _timeRecords,
  setTimeRecords,
  globalTimers,
  setGlobalTimers,
  categories,
  setCategories
}: {
  selectedCategory?: CategoryId;
  setSelectedCategory?: (category: CategoryId) => void;
  timeRecords: TimeRecord[];
  setTimeRecords: React.Dispatch<React.SetStateAction<TimeRecord[]>>;
  globalTimers: Timer[];
  setGlobalTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
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

  // categories 现在从 props 传入，不再在组件内部定义
  
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
  const [editingCategoryColorId, setEditingCategoryColorId] = useState<string | null>(null); // 正在编辑颜色的分类ID
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
  // 记录响铃时的计时器ID（因为计时结束后 activeTimer 会被清空）
  const [_alarmTimerId, setAlarmTimerId] = useState<string | null>(null);
  // 番茄钟等待进入下一阶段的状态
  const [pomodoroWaitingNextPhase, setPomodoroWaitingNextPhase] = useState(false);
  // 下一阶段信息
  const [nextPhaseInfo, setNextPhaseInfo] = useState<{ phase: 'work' | 'break' | 'longBreak'; round: number } | null>(null);
  
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
  
  // 是否已恢复计时器状态
  const hasRestoredTimer = useRef(false);
  
  // 防止重复保存记录的标志
  const lastSavedRecordKey = useRef<string | null>(null);

  // 从localStorage恢复计时器状态
  useEffect(() => {
    // 只恢复一次，且需要 globalTimers 已加载
    if (hasRestoredTimer.current || globalTimers.length === 0) return;
    
    const persistentState = loadPersistentTimerState();
    if (persistentState?.focusTimer && persistentState.focusTimer.status !== 'idle') {
      hasRestoredTimer.current = true;
      const { focusTimer } = persistentState;
      const timer = globalTimers.find(t => t.id === focusTimer.activeTimerId);
      
      if (timer && focusTimer.startTimestamp) {
        // 恢复计时器模式和配置
        setTimerMode(focusTimer.timerMode);
        if (focusTimer.timerDuration) {
          setTimerDuration(focusTimer.timerDuration); // 恢复倒计时时长
        }
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
            // 计时已完成，先保存记录再播放铃声
            // 根据时间戳计算开始时间
            const startTime = new Date(focusTimer.startTimestamp);
            // 直接构造记录并保存，避免依赖状态
            const endTime = new Date();
            const formatTimeStr = (date: Date) => {
              return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            };
            const formatDateStr = (date: Date) => {
              return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            };
            const newRecord: TimeRecord = {
              id: `timer_restore_${Date.now()}`,
              name: timer.name,
              date: formatDateStr(startTime),
              startTime: formatTimeStr(startTime),
              endTime: formatTimeStr(endTime),
              source: 'timer',
              categoryId: timer.categoryId,
              createdAt: Date.now()
            };
            console.log('TimerView 恢复时保存记录:', newRecord);
            setTimeRecords(prev => [...prev, newRecord]);
            
            alarmPlayer.play(10000);
            setAlarmTimerId(timer.id);
            setIsAlarmPlaying(true);
            setTimeout(() => { setIsAlarmPlaying(false); setAlarmTimerId(null); }, 10000);
            
            // 自动重置计时器
            const updatedTimer = { ...timer, status: 'idle' as TimerStatus, remainingTime: timer.duration * 60 };
            setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
            setActiveTimer(null);
            setTimerStartTime(null);
            setElapsedTime(0);
            setPomodoroPhase('work');
            setCurrentPomodoroRound(1);
            
            // 清除持久化状态
            savePersistentTimerState({ ...persistentState, focusTimer: null });
          } else {
            // 恢复运行状态
            setTimerStartTimestamp(focusTimer.startTimestamp);
            // 关键修复：恢复 timerStartTime，用于后续保存记录
            setTimerStartTime(new Date(focusTimer.startTimestamp));
            setElapsedTime(elapsed);
            
            const updatedTimer = { ...timer, status: 'running' as TimerStatus, remainingTime };
            setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
            setActiveTimer(updatedTimer);
            // 自动切换到正在计时的分类
            handleCategoryChange(timer.categoryId);
          }
        } else if (focusTimer.status === 'paused' && focusTimer.pausedAt !== null) {
          // 恢复暂停状态
          // 关键修复：恢复 timerStartTime
          setTimerStartTime(new Date(focusTimer.startTimestamp));
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
          // 自动切换到正在计时的分类
          handleCategoryChange(timer.categoryId);
        }
      }
    }
  }, [globalTimers]);

  // 保存计时器状态到localStorage
  useEffect(() => {
    if (activeTimer && (activeTimer.status === 'running' || activeTimer.status === 'paused')) {
      const persistentState = loadPersistentTimerState() || { focusTimer: null, planTimer: null };
      
      // 计算正确的totalDuration
      let totalDuration = 0;
      if (timerMode === 'countup') {
        totalDuration = 0;
      } else if (timerMode === 'countdown') {
        totalDuration = timerDuration * 60;
      } else if (timerMode === 'pomodoro') {
        // 番茄钟模式：根据当前阶段计算时长
        totalDuration = pomodoroPhase === 'work' 
          ? pomodoroConfig.workDuration * 60 
          : pomodoroPhase === 'break' 
          ? pomodoroConfig.breakDuration * 60 
          : pomodoroConfig.longBreakDuration * 60;
      }
      
      const focusTimerState = {
        activeTimerId: activeTimer.id,
        timerMode,
        timerDuration, // 保存倒计时时长
        startTimestamp: timerStartTimestamp,
        pausedAt: activeTimer.status === 'paused' 
          ? (timerMode === 'countup' ? elapsedTime : activeTimer.remainingTime)
          : null,
        totalDuration,
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
  }, [activeTimer?.status, activeTimer?.id, timerStartTimestamp, elapsedTime, timerMode, timerDuration, pomodoroConfig, currentPomodoroRound, pomodoroPhase]);

  // 计时器逻辑
  useEffect(() => {
    let interval: number;
    
    if (activeTimer && activeTimer.status === 'running') {
      interval = window.setInterval(() => {
        if (timerMode === 'countup') {
          // 正计时模式 - 基于时间戳实时计算
          if (timerStartTimestamp) {
            const elapsed = Math.floor((Date.now() - timerStartTimestamp) / 1000);
            setElapsedTime(elapsed);
          } else {
            setElapsedTime(prev => prev + 1);
          }
        } else if (timerMode === 'countdown') {
          // 倒计时模式 - 基于时间戳计算剩余时间
          if (timerStartTimestamp) {
            const elapsed = Math.floor((Date.now() - timerStartTimestamp) / 1000);
            const initialDuration = timerDuration * 60;
            const newRemaining = Math.max(0, initialDuration - elapsed);
            
            if (newRemaining <= 0) {
              // 倒计时结束，保存记录
              const timerId = activeTimer?.id;
              if (timerStartTime && activeTimer) {
                saveTimeRecord(activeTimer, timerStartTime, new Date());
              }
              // 自动重置计时器
              setTimers(timers => timers.map(t => 
                t.id === activeTimer?.id ? { ...t, status: 'idle' as TimerStatus, remainingTime: t.duration * 60 } : t
              ));
              // 倒计时结束，播放铃声
              alarmPlayer.play(10000);
              setAlarmTimerId(timerId || null);
              setIsAlarmPlaying(true);
              setTimeout(() => { setIsAlarmPlaying(false); setAlarmTimerId(null); }, 10000);
              setTimerStartTime(null);
              setElapsedTime(0);
              setActiveTimer(null);
            } else {
              const updated = { ...activeTimer, remainingTime: newRemaining };
              setTimers(timers => timers.map(t =>
                t.id === activeTimer?.id ? updated : t
              ));
              setActiveTimer(updated);
            }
          }
        } else if (timerMode === 'pomodoro') {
          // 番茄钟模式 - 基于时间戳计算剩余时间
          if (timerStartTimestamp) {
            const elapsed = Math.floor((Date.now() - timerStartTimestamp) / 1000);
            const phaseDuration = pomodoroPhase === 'work' 
              ? pomodoroConfig.workDuration * 60 
              : pomodoroPhase === 'break' 
              ? pomodoroConfig.breakDuration * 60 
              : pomodoroConfig.longBreakDuration * 60;
            const newRemaining = Math.max(0, phaseDuration - elapsed);
            
            if (newRemaining <= 0 && !pomodoroWaitingNextPhase) {
              // 当前阶段结束，播放铃声提醒，暂停计时器等待用户确认
              alarmPlayer.play(10000);
              setAlarmTimerId(activeTimer?.id || null);
              setIsAlarmPlaying(true);
              setPomodoroWaitingNextPhase(true);
              
              // 暂停计时器
              if (activeTimer) {
                const updated = { ...activeTimer, status: 'paused' as TimerStatus, remainingTime: 0 };
                setTimers(timers => timers.map(t => t.id === activeTimer.id ? updated : t));
                setActiveTimer(updated);
              }
              
              // 计算下一阶段信息
              if (pomodoroPhase === 'work') {
                if (currentPomodoroRound >= pomodoroConfig.rounds) {
                  setNextPhaseInfo({ phase: 'longBreak', round: 1 });
                } else {
                  setNextPhaseInfo({ phase: 'break', round: currentPomodoroRound });
                }
              } else if (pomodoroPhase === 'break') {
                setNextPhaseInfo({ phase: 'work', round: currentPomodoroRound + 1 });
              } else {
                // 长休息结束，整个番茄钟周期完成
                setNextPhaseInfo(null);
              }
            } else if (!pomodoroWaitingNextPhase) {
              if (activeTimer) {
                const updated = { ...activeTimer, remainingTime: newRemaining };
                setTimers(timers => timers.map(t => t.id === activeTimer.id ? updated : t));
                setActiveTimer(updated);
              }
            }
          }
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer?.status, activeTimer?.id, timerMode, pomodoroPhase, currentPomodoroRound, pomodoroConfig, timerStartTimestamp, timerDuration, timerStartTime]);

  // 监听页面可见性变化，确保后台返回时检查计时器状态
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeTimer?.status === 'running' && timerStartTimestamp) {
        // 页面重新可见，立即检查计时器状态
        if (timerMode === 'countdown') {
          const elapsed = Math.floor((Date.now() - timerStartTimestamp) / 1000);
          const initialDuration = timerDuration * 60;
          const newRemaining = Math.max(0, initialDuration - elapsed);
          if (newRemaining <= 0) {
            // 计算结束了多久
            const endedSecondsAgo = elapsed - initialDuration;
            // 只在结束后10秒内播放铃声
            if (endedSecondsAgo <= 10) {
              const duration = 10000 - endedSecondsAgo * 1000;
              alarmPlayer.play(duration);
              setAlarmTimerId(activeTimer?.id || null);
              setIsAlarmPlaying(true);
              setTimeout(() => { setIsAlarmPlaying(false); setAlarmTimerId(null); }, duration);
            }
          }
        } else if (timerMode === 'pomodoro') {
          const elapsed = Math.floor((Date.now() - timerStartTimestamp) / 1000);
          const phaseDuration = pomodoroPhase === 'work' 
            ? pomodoroConfig.workDuration * 60 
            : pomodoroPhase === 'break' 
            ? pomodoroConfig.breakDuration * 60 
            : pomodoroConfig.longBreakDuration * 60;
          const newRemaining = Math.max(0, phaseDuration - elapsed);
          if (newRemaining <= 0) {
            // 计算结束了多久
            const endedSecondsAgo = elapsed - phaseDuration;
            // 只在结束后10秒内播放铃声
            if (endedSecondsAgo <= 10) {
              const duration = 10000 - endedSecondsAgo * 1000;
              alarmPlayer.play(duration);
              setAlarmTimerId(activeTimer?.id || null);
              setIsAlarmPlaying(true);
              setTimeout(() => { setIsAlarmPlaying(false); setAlarmTimerId(null); }, duration);
            }
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTimer?.status, timerStartTimestamp, timerMode, timerDuration, pomodoroPhase, pomodoroConfig]);

  // 更新标签页标题显示计时器状态
  useEffect(() => {
    if (activeTimer && activeTimer.status === 'running') {
      const timeValue = timerMode === 'countup' ? elapsedTime : activeTimer.remainingTime;
      updateDocumentTitle(activeTimer.name, timeValue, timerMode, pomodoroPhase, true);
    } else {
      updateDocumentTitle(null, 0, 'countdown', undefined, false);
    }
    
    // 组件卸载时恢复原标题
    return () => {
      document.title = ORIGINAL_TITLE;
    };
  }, [activeTimer?.status, activeTimer?.name, activeTimer?.remainingTime, elapsedTime, timerMode, pomodoroPhase]);

  const theme = selectedCategory === 'uncategorized' 
    ? { primary: '#9ca3af', light: '#f3f4f6', text: '#6b7280' }
    : (MACARON_COLORS.categories[selectedCategory as CategoryId] || {
        primary: '#FF8CA1',
        light: '#FFF0F3', 
        text: '#D9455F'
      });

  // 格式化时间，正计时始终显示时分秒
  const formatTime = (seconds: number, alwaysShowHours: boolean = false) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (alwaysShowHours || hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
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
    setTimerMode('countup'); // 默认选中正计时
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
    // 生成唯一键，防止重复保存
    const recordKey = `${timer.id}_${startTime.getTime()}`;
    if (lastSavedRecordKey.current === recordKey) {
      console.log('TimerView saveTimeRecord: 跳过重复保存', recordKey);
      return;
    }
    lastSavedRecordKey.current = recordKey;
    
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
    
    console.log('TimerView saveTimeRecord: 保存记录', newRecord);
    setTimeRecords(prev => [...prev, newRecord]);
  };

  // 停止响铃并进入番茄钟下一阶段
  const stopAlarmAndProceed = () => {
    alarmPlayer.stop();
    setIsAlarmPlaying(false);
    setAlarmTimerId(null);
    
    // 如果是番茄钟等待下一阶段
    if (pomodoroWaitingNextPhase && nextPhaseInfo && activeTimer) {
      setPomodoroWaitingNextPhase(false);
      
      if (nextPhaseInfo.phase === 'longBreak') {
        // 工作阶段结束，进入长休息前保存记录
        if (timerStartTime) {
          saveTimeRecord(activeTimer, timerStartTime, new Date());
        }
        setPomodoroPhase('longBreak');
        setCurrentPomodoroRound(1);
        const nextRemaining = pomodoroConfig.longBreakDuration * 60;
        const updated = { ...activeTimer, status: 'running' as TimerStatus, remainingTime: nextRemaining };
        setTimers(timers => timers.map(t => t.id === activeTimer.id ? updated : t));
        setActiveTimer(updated);
        setTimerStartTimestamp(Date.now());
      } else if (nextPhaseInfo.phase === 'break') {
        // 工作阶段结束，进入短休息前保存记录
        if (timerStartTime) {
          saveTimeRecord(activeTimer, timerStartTime, new Date());
        }
        setPomodoroPhase('break');
        const nextRemaining = pomodoroConfig.breakDuration * 60;
        const updated = { ...activeTimer, status: 'running' as TimerStatus, remainingTime: nextRemaining };
        setTimers(timers => timers.map(t => t.id === activeTimer.id ? updated : t));
        setActiveTimer(updated);
        setTimerStartTimestamp(Date.now());
      } else if (nextPhaseInfo.phase === 'work') {
        // 休息阶段结束，进入工作阶段，重置开始时间
        setPomodoroPhase('work');
        setCurrentPomodoroRound(nextPhaseInfo.round);
        const nextRemaining = pomodoroConfig.workDuration * 60;
        const updated = { ...activeTimer, status: 'running' as TimerStatus, remainingTime: nextRemaining };
        setTimers(timers => timers.map(t => t.id === activeTimer.id ? updated : t));
        setActiveTimer(updated);
        setTimerStartTime(new Date());
        setTimerStartTimestamp(Date.now());
      }
      setNextPhaseInfo(null);
    } else if (pomodoroWaitingNextPhase && !nextPhaseInfo && activeTimer) {
      // 长休息结束，整个番茄钟周期完成（休息阶段不保存记录）
      setPomodoroWaitingNextPhase(false);
      setTimers(timers => timers.map(t => 
        t.id === activeTimer.id ? { ...t, status: 'idle' as TimerStatus, remainingTime: t.duration * 60 } : t
      ));
      setPomodoroPhase('work');
      setCurrentPomodoroRound(1);
      setTimerStartTime(null);
      setElapsedTime(0);
      setActiveTimer(null);
    }
  };

  const startTimer = (timer: Timer) => {
    // 解锁音频（移动端需要在用户交互时触发）
    alarmPlayer.unlock();
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
    // 正计时、倒计时都保存，番茄钟只保存工作阶段
    if (timerStartTime && activeTimer?.id === timer.id) {
      if (timerMode !== 'pomodoro' || pomodoroPhase === 'work') {
        saveTimeRecord(timer, timerStartTime, new Date());
      }
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
      // 保存工作阶段的记录
      if (timerStartTime) {
        saveTimeRecord(timer, timerStartTime, new Date());
      }
      
      if (currentPomodoroRound >= pomodoroConfig.rounds) {
        // 已经是最后一轮，自动重置计时器
        const updatedTimer = { ...timer, status: 'idle' as TimerStatus, remainingTime: timer.duration * 60 };
        setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
        setActiveTimer(null);
        setTimerStartTime(null);
        setElapsedTime(0);
        setPomodoroPhase('work');
        setCurrentPomodoroRound(1);
        return;
      } else {
        // 进入短休息
        setPomodoroPhase('break');
        newRemainingTime = pomodoroConfig.breakDuration * 60;
        // 重置开始时间（休息阶段不计入记录）
        setTimerStartTimestamp(Date.now());
      }
    } else if (pomodoroPhase === 'break') {
      // 当前是短休息，跳到下一轮专注
      setPomodoroPhase('work');
      setCurrentPomodoroRound(prev => prev + 1);
      newRemainingTime = pomodoroConfig.workDuration * 60;
      // 重置开始时间（新的工作阶段）
      setTimerStartTime(new Date());
      setTimerStartTimestamp(Date.now());
    } else {
      // 当前是长休息，自动重置计时器（休息阶段不保存记录）
      const updatedTimer = { ...timer, status: 'idle' as TimerStatus, remainingTime: timer.duration * 60 };
      setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
      setActiveTimer(null);
      setTimerStartTime(null);
      setElapsedTime(0);
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
  
  // 获取当前选中分类的完整对象，检查是否有自定义颜色
  const currentCategory = categories.find(c => c.id === selectedCategory);
  const hasCustomBgColor = currentCategory?.color !== undefined && currentCategory?.color !== null && currentCategory?.color !== '';
  
  // 背景色：优先使用用户自定义颜色，否则使用预定义主题色，主色 + 4% 不透明度
  const categoryBgColor = hasCustomBgColor 
    ? hexToRgba(currentCategory!.color!, 0.04) 
    : hexToRgba(currentCategoryTheme.primary, 0.04);

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
            // 获取预定义主题
            const predefinedTheme = MACARON_COLORS.categories[cat.id as CategoryId];
            
            // hex 转 rgba 的辅助函数
            const hexToRgba = (hex: string, alpha: number) => {
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };
            
            // 判断是否有自定义颜色（cat.color 存在且不为空）
            const hasCustomColor = cat.color !== undefined && cat.color !== null && cat.color !== '';
            
            // 主色：优先使用用户自定义颜色，否则使用预定义颜色
            const primaryColor = hasCustomColor ? cat.color! : (predefinedTheme?.primary || '#FF8CA1');
            
            // 背景色：如果有自定义颜色，基于自定义颜色生成 rgba；否则使用预定义浅色
            const lightBgColor = hasCustomColor 
              ? hexToRgba(cat.color!, 0.2) 
              : (predefinedTheme?.light || '#FFF0F3');
            
            return (
              <button 
                key={cat.id} 
                onClick={() => handleCategoryChange(cat.id as CategoryId)}
                className={`relative w-full py-3 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${isSelected ? 'shadow-lg scale-105 border-2' : 'hover:bg-white/40 hover:scale-105'}`}
                style={{ 
                  borderColor: isSelected ? primaryColor : 'transparent',
                  backgroundColor: isSelected ? lightBgColor : 'transparent'
                }}
              >
                <span 
                  className="text-[10px] font-black"
                  style={{ color: isSelected ? primaryColor : '#9ca3af' }}
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
              {(() => {
                // 获取当前选中分类的完整对象，检查是否有自定义颜色
                const currentCat = categories.find(c => c.id === selectedCategory);
                const hasCurrentCustomColor = currentCat?.color !== undefined && currentCat?.color !== null && currentCat?.color !== '';
                const predefinedCurrentTheme = MACARON_COLORS.categories[selectedCategory as CategoryId] || {
                  primary: '#9ca3af',
                  light: '#f3f4f6',
                  text: '#6b7280'
                };
                // 优先使用用户自定义颜色
                const currentTheme = {
                  primary: hasCurrentCustomColor ? currentCat!.color! : predefinedCurrentTheme.primary,
                  light: hasCurrentCustomColor ? hexToRgba(currentCat!.color!, 0.15) : predefinedCurrentTheme.light,
                  text: predefinedCurrentTheme.text
                };
                return (
                  <button 
                    onClick={() => setShowNewTimerModal(true)}
                    className="px-8 py-6 rounded-2xl border-2 border-dashed font-bold active:scale-95 transition-all flex flex-col items-center gap-3"
                    style={{ 
                      borderColor: currentTheme.primary,
                      color: currentTheme.primary,
                      backgroundColor: hasCurrentCustomColor ? hexToRgba(currentCat!.color!, 0.05) : `${currentTheme.primary}0D`
                    }}
                  >
                    <span>创建「{selectedCategory === 'uncategorized' ? '待分类' : categories.find(c => c.id === selectedCategory)?.label}」的第一个计时器吧～</span>
                    <Plus size={32} strokeWidth={2} />
                  </button>
                );
              })()}
            </div>
          ) : (
            // 计时器列表 - 两列网格
            <div className="grid grid-cols-2 gap-3">
              {categoryTimers.map(timer => {
                const isTimerActive = activeTimer?.id === timer.id && (timer.status === 'running' || timer.status === 'paused');
                const isSwiped = swipedTimerId === timer.id;
                
                // 获取计时器所属分类的完整对象，检查是否有自定义颜色
                const timerCategory = categories.find(c => c.id === timer.categoryId);
                const hasTimerCustomColor = timerCategory?.color !== undefined && timerCategory?.color !== null && timerCategory?.color !== '';
                const predefinedTheme = MACARON_COLORS.categories[timer.categoryId as CategoryId] || {
                  primary: '#9ca3af',
                  light: '#f3f4f6',
                  text: '#6b7280'
                };
                // 优先使用用户自定义颜色
                const theme = {
                  primary: hasTimerCustomColor ? timerCategory!.color! : predefinedTheme.primary,
                  light: hasTimerCustomColor ? hexToRgba(timerCategory!.color!, 0.15) : predefinedTheme.light,
                  text: predefinedTheme.text
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
                    className={`relative w-full rounded-2xl p-3 bg-white border-2 transition-transform duration-300 cursor-pointer min-h-[140px] ${
                      activeTimer?.id === timer.id ? 'ring-2 ring-purple-100' : ''
                    }`}
                    style={{ 
                      boxShadow: `0 4px 12px -2px ${theme.primary}30, 0 8px 20px -8px ${theme.primary}40`,
                      borderColor: timer.status === 'running' ? theme.primary : 
                                  timer.status === 'completed' ? '#42D4A4' : theme.primary,
                      transform: isSwiped ? 'translateX(-96px)' : 'translateX(0)',
                      touchAction: 'pan-y'
                    }}
                    onClick={(e) => {
                      // 如果点击的是更多按钮区域，不触发
                      if ((e.target as HTMLElement).closest('.more-btn')) return;
                      // 如果已滑动，先收回
                      if (isSwiped) {
                        setSwipedTimerId(null);
                        return;
                      }
                      // 如果不是计时中状态，打开计时模式选择弹窗
                      if (!isTimerActive) {
                        startTimer(timer);
                      }
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
                      }
                    }}
                  >
                  {/* 更多按钮 - 右上角 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSwipedTimerId(isSwiped ? null : timer.id);
                    }}
                    className="more-btn absolute top-2 right-2 w-6 h-6 rounded-lg flex flex-col items-center justify-center gap-[2px] hover:bg-gray-100 transition-all"
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
                          {timerMode === 'countup' ? formatTime(elapsedTime, true) : formatTime(timer.remainingTime)}
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
                        </div>
                      </>
                    ) : (
                      // 默认内容
                      <div className="flex flex-col items-center justify-center flex-1">
                        <div 
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-[18px]"
                        >
                          {timer.icon}
                        </div>
                        <div className="flex items-center justify-center gap-2.5 w-full px-1">
                          <h4 className="text-sm font-bold text-[#2D2D2D] truncate">{timer.name}</h4>
                          <Play size={12} fill={theme.primary} style={{ color: theme.primary, flexShrink: 0 }} />
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              )})}
              
              {/* 添加计时器按钮 */}
              {(() => {
                // 获取当前选中分类的完整对象，检查是否有自定义颜色
                const currentCat = categories.find(c => c.id === selectedCategory);
                const hasCurrentCustomColor = currentCat?.color !== undefined && currentCat?.color !== null && currentCat?.color !== '';
                const predefinedCurrentTheme = MACARON_COLORS.categories[selectedCategory as CategoryId] || {
                  primary: '#9ca3af',
                  light: '#f3f4f6',
                  text: '#6b7280'
                };
                // 优先使用用户自定义颜色
                const currentTheme = {
                  primary: hasCurrentCustomColor ? currentCat!.color! : predefinedCurrentTheme.primary,
                  light: hasCurrentCustomColor ? hexToRgba(currentCat!.color!, 0.15) : predefinedCurrentTheme.light,
                  text: predefinedCurrentTheme.text
                };
                return (
                  <div 
                    onClick={() => setShowNewTimerModal(true)}
                    className="relative rounded-2xl p-3 border-2 border-dashed active:scale-98 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px]"
                    style={{
                      borderColor: currentTheme.primary,
                      backgroundColor: hasCurrentCustomColor ? hexToRgba(currentCat!.color!, 0.05) : `${currentTheme.primary}0D`
                    }}
                  >
                    <Plus size={32} style={{ color: currentTheme.primary }} />
                    <span className="text-xs font-bold mt-2" style={{ color: currentTheme.primary }}>添加计时器</span>
                  </div>
                );
              })()}
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
        <div 
          className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in"
          onClick={() => {
            setShowNewTimerModal(false);
            setNewTimerName('');
            setNewTimerIcon('🎯');
            setNewTimerCategory(selectedCategory);
          }}
        >
          <div 
            className="bg-white w-[90%] rounded-3xl p-6 shadow-2xl animate-scale-in max-h-[85%] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => {
                setShowNewTimerModal(false);
                setNewTimerName('');
                setNewTimerIcon('🎯');
                setNewTimerCategory(selectedCategory);
              }}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"
            >
              <X size={18} />
            </button>
            
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

            <div className="mt-6">
              <Button 
                variant="outline"
                onClick={addTimer}
                disabled={!newTimerName.trim()}
                className="w-full"
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
                const isEditingColor = editingCategoryColorId === cat.id;
                return (
                  <div 
                    key={cat.id}
                    className="bg-gray-50 rounded-2xl p-3"
                  >
                    <div className="flex items-center gap-3">
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
                      
                      {/* 颜色标识 - 点击可编辑 */}
                      <button 
                        onClick={() => setEditingCategoryColorId(isEditingColor ? null : cat.id)}
                        className="w-6 h-6 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-transparent hover:ring-gray-300 transition-all"
                        style={{ backgroundColor: cat.color || catTheme.primary }}
                        title="点击修改颜色"
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
                    
                    {/* 颜色选择器 - 展开时显示 */}
                    {isEditingColor && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-400 mb-2">选择颜色</p>
                        <div className="flex gap-2 flex-wrap">
                          {['#FF8CA1', '#FFD23F', '#42D4A4', '#B589F6', '#6CB6FF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA000', '#E91E63', '#9C27B0', '#3F51B5'].map(color => (
                            <button
                              key={color}
                              onClick={() => {
                                setCategories(categories.map(c => 
                                  c.id === cat.id ? { ...c, color } : c
                                ));
                                setEditingCategoryColorId(null);
                              }}
                              className={`w-7 h-7 rounded-full transition-all ${
                                (cat.color || catTheme.primary) === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
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
                className="!shadow-none hover:!shadow-none active:!shadow-none !translate-y-0 hover:!translate-y-0 active:!translate-y-0"
                style={{ 
                  backgroundColor: newCategoryColor,
                  boxShadow: `0 8px 20px ${newCategoryColor}40`
                }}
              >
                <Plus size={18} />
                添加分类
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 浮动停止响铃按钮 - 铃声响起时显示 */}
      {isAlarmPlaying && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={() => stopAlarmAndProceed()}
            className="px-6 py-3 rounded-full bg-pink-500 text-white font-bold shadow-lg hover:bg-pink-600 transition-all animate-pulse flex items-center gap-2"
            style={{ boxShadow: '0 10px 30px rgba(236, 72, 153, 0.4)' }}
          >
            <span className="text-xl">🔔</span>
            <span>停止响铃</span>
          </button>
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
  const [swipedJournalId, setSwipedJournalId] = useState<string | null>(null); // 当前滑动打开的日记ID
  const [touchStartX, setTouchStartX] = useState<number>(0);
  const [touchCurrentX, setTouchCurrentX] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);

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
      <div className="flex flex-col h-full relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #F9F6FD 0%, #FFFFFF 100%)' }}>
        {/* 背景装饰 */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-2xl opacity-50" style={{ backgroundColor: '#E6E6FA' }}></div>
        <div className="absolute -left-10 bottom-20 w-32 h-32 rounded-full blur-xl opacity-40" style={{ backgroundColor: '#E0C3FC' }}></div>
        
        {/* 编辑器头部 */}
        <div className="px-6 pt-8 pb-4 flex justify-between items-center backdrop-blur-sm sticky top-0 z-10">
          <button 
            onClick={() => setView('list')}
            className="p-2 -ml-2"
            style={{ color: '#BA68C8' }}
          >
            <ChevronLeft size={24} />
          </button>
          <span className="font-bold" style={{ color: '#BA68C8' }}>写日记</span>
          <button 
            onClick={saveJournal}
            className="font-bold p-2 -mr-2"
            style={{ color: '#BA68C8' }}
            disabled={!currentJournal.content.trim()}
          >
            <Check size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 z-10">
          {/* 日期选择 */}
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider block mb-3" style={{ color: '#BA68C8' }}>
              日期
            </span>
            <div className="relative">
              <input
                type="date"
                value={editingJournalDate}
                onChange={(e) => setEditingJournalDate(e.target.value)}
                max={getTodayStr()}
                className="w-full px-5 py-4 rounded-2xl bg-white font-bold text-base focus:outline-none transition-all appearance-none cursor-pointer"
                style={{
                  colorScheme: 'light',
                  color: '#6A4C93',
                  boxShadow: '0 4px 15px rgba(186, 104, 200, 0.1)',
                  border: 'none'
                }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Calendar size={20} style={{ color: '#BA68C8' }} />
              </div>
            </div>
            {/* 显示友好的日期格式 */}
            {editingJournalDate && (
              <p className="text-xs mt-2 ml-1" style={{ color: '#CE93D8' }}>
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
            <span className="text-xs font-bold uppercase tracking-wider block mb-3" style={{ color: '#BA68C8' }}>
              当下心情
            </span>
            <div className="flex gap-3 overflow-x-auto py-2 px-1 -mx-1">
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
                    className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: 'rgba(209, 196, 233, 0.15)',
                      border: '2px dashed #D1C4E9',
                      color: '#BA68C8'
                    }}
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
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: '#F9F6FD' }}>
      {/* 背景装饰 */}
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-2xl opacity-50" style={{ backgroundColor: '#E6E6FA' }}></div>
      <div className="absolute -left-10 bottom-40 w-32 h-32 rounded-full blur-xl opacity-40" style={{ backgroundColor: '#E0C3FC' }}></div>
      
      {/* 头部 */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-end z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black mb-2" style={{ color: '#9E7CB8' }}>心情日记</h2>
            <div className="w-2 h-2 rounded-full ring-2" style={{ backgroundColor: '#E0C3FC', borderColor: '#CFA0E9' }}></div>
          </div>
        </div>
        <button 
          onClick={() => openEditor()}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl hover:brightness-110 active:scale-90 transition-all border-b-4"
          style={{ 
            backgroundColor: '#CFA0E9', 
            borderColor: 'rgba(159, 124, 184, 0.3)',
            boxShadow: '0 10px 20px -5px rgba(207, 160, 233, 0.4)' 
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
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#CFA0E9' }}></div>
                    <span className="text-sm font-black text-gray-600">
                      {formatDate(dateJournals[0].date)}
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: '#E6E6FA' }}></div>
                  </div>
                  
                  {/* 该日期下的日记卡片 */}
                  <div className="space-y-3 ml-1">
                    {dateJournals.map(journal => {
                      const mood = moods.find(m => m.id === journal.mood);
                      const timeStr = new Date(journal.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                      const isThisSwiped = swipedJournalId === journal.id;
                      const swipeOffset = isSwiping && isThisSwiped ? Math.min(0, touchCurrentX - touchStartX) : (isThisSwiped ? -80 : 0);
                      
                      return (
                        <div 
                          key={journal.id}
                          className="relative"
                          style={{ overflow: 'hidden', borderRadius: '2rem' }}
                        >
                          {/* 删除按钮背景 - 只在滑动时显示 */}
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center"
                            style={{ 
                              borderRadius: '0 2rem 2rem 0',
                              opacity: swipeOffset < 0 ? 1 : 0,
                              transition: 'opacity 0.2s'
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setJournals(journals.filter(j => j.id !== journal.id));
                                setSwipedJournalId(null);
                              }}
                              className="w-full h-full flex items-center justify-center text-white font-bold"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                          
                          {/* 日记卡片内容 */}
                          <div 
                            onClick={() => {
                              if (!isSwiping && swipeOffset === 0) {
                                openEditor(journal);
                              }
                            }}
                            onTouchStart={(e) => {
                              setTouchStartX(e.touches[0].clientX);
                              setTouchCurrentX(e.touches[0].clientX);
                              setIsSwiping(true);
                            }}
                            onTouchMove={(e) => {
                              if (isSwiping) {
                                setTouchCurrentX(e.touches[0].clientX);
                                // 如果是向左滑动，设置当前日记为滑动状态
                                if (e.touches[0].clientX < touchStartX - 10) {
                                  setSwipedJournalId(journal.id);
                                }
                              }
                            }}
                            onTouchEnd={() => {
                              setIsSwiping(false);
                              const diff = touchCurrentX - touchStartX;
                              // 如果滑动距离超过40px，保持打开状态
                              if (diff < -40) {
                                setSwipedJournalId(journal.id);
                              } else if (diff > 40 || (diff > -40 && diff < 0)) {
                                // 向右滑动或滑动距离不够，关闭
                                setSwipedJournalId(null);
                              }
                            }}
                            className="bg-white/95 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
                            style={{ 
                              border: '2px solid #E6E6FA',
                              borderRadius: '2rem',
                              transform: `translateX(${swipeOffset}px)`,
                              transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
                            }}
                          >
                            {/* 左侧装饰条 */}
                            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: '#E0C3FC', borderRadius: '2rem 0 0 2rem' }}></div>
                            <div className="flex items-start gap-4">
                              {/* 心情图标 */}
                              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
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
  setTimeRecords,
  globalTimers: _globalTimers,
  setGlobalTimers,
  idealTimeAllocation 
}: { 
  journals: Journal[]; 
  timeRecords: TimeRecord[];
  setTimeRecords: (records: TimeRecord[]) => void;
  globalTimers: Timer[];
  setGlobalTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
  idealTimeAllocation: Record<string, number>;
}) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'ai' | 'habits'>('progress');
  const [aiPeriod, setAiPeriod] = useState<'yesterday' | 'today' | 'week' | 'month' | 'history'>('today');
  const [generatingPeriods, setGeneratingPeriods] = useState<Set<string>>(new Set()); // 支持多个时间段同时生成
  const [generatingProgress, setGeneratingProgress] = useState<Record<string, string>>({}); // 每个时间段的进度
  
  // 当前进度时间周期
  const [progressPeriod, setProgressPeriod] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');
  
  // 复盘历史记录 - 从localStorage加载
  const [reportHistory, setReportHistory] = useState<Array<{
    id: string;
    period: 'yesterday' | 'today' | 'week' | 'month' | 'history';
    periodLabel: string;
    dateRange: string;
    createdAt: number;
    report: any;
  }>>(() => {
    const saved = localStorage.getItem('aiReportHistory');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [viewingHistoryReport, setViewingHistoryReport] = useState<any>(null);
  
  // 根据当前时间段获取对应的报告
  const reportData = useMemo(() => {
    const historyItem = reportHistory.find(h => h.period === aiPeriod);
    return historyItem?.report || null;
  }, [reportHistory, aiPeriod]);

  // 保存reportHistory到localStorage
  useEffect(() => {
    localStorage.setItem('aiReportHistory', JSON.stringify(reportHistory));
  }, [reportHistory]);

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
  const [eventSearchQuery, setEventSearchQuery] = useState(''); // 事件搜索关键词
  
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
    const currentPeriod = aiPeriod as 'yesterday' | 'today' | 'week' | 'month';
    
    // 添加到正在生成的时间段集合
    setGeneratingPeriods(prev => new Set([...prev, currentPeriod]));
    setGeneratingProgress(prev => ({ ...prev, [currentPeriod]: '正在收集数据...' }));
    
    // 获取数据
    const actualDistribution = calculateActualTimeDistribution(currentPeriod);
    const periodJournals = getJournalsInPeriod(currentPeriod);
    const periodLabels: Record<string, string> = { yesterday: '昨日', today: '今日', week: '本周', month: '本月', history: '历史' };
    const periodDays: Record<string, number> = { yesterday: 1, today: 1, week: 7, month: 30, history: 365 };
    
    setGeneratingProgress(prev => ({ ...prev, [currentPeriod]: '正在分析时间分布...' }));
    
    // 准备数据
    const days = periodDays[currentPeriod];
    const totalActualHours = Object.values(actualDistribution).reduce((sum, h) => sum + h, 0);
    
    // 分析日记情绪
    const moodCounts: Record<string, number> = {};
    periodJournals.forEach(j => {
      if (j.mood) {
        moodCounts[j.mood] = (moodCounts[j.mood] || 0) + 1;
      }
    });
    
    setGeneratingProgress(prev => ({ ...prev, [currentPeriod]: '正在计算理想与实际差距...' }));
    
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
    
    setGeneratingProgress(prev => ({ ...prev, [currentPeriod]: '正在构建AI提示词...' }));
    
    // 获取具体的时间记录详情（用于新提示词）
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    let startDateStr = '';
    switch (currentPeriod) {
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
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        startDateStr = `${monday.getFullYear()}-${(monday.getMonth() + 1).toString().padStart(2, '0')}-${monday.getDate().toString().padStart(2, '0')}`;
        break;
      }
      case 'month':
        startDateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
        break;
      default:
        startDateStr = todayStr;
    }
    const periodRecords = timeRecords.filter(r => r.date >= startDateStr && r.date <= todayStr);
    
    // 按分类整理具体事件
    const eventsByCategory: Record<string, Array<{name: string, minutes: number, date: string, startTime: string, endTime: string}>> = {};
    periodRecords.forEach(record => {
      const start = record.startTime.split(':').map(Number);
      const end = record.endTime.split(':').map(Number);
      let minutes = end[0] * 60 + end[1] - start[0] * 60 - start[1];
      if (minutes < 0) minutes += 24 * 60;
      if (minutes === 0) minutes = 1;
      
      const category = record.categoryId || 'uncategorized';
      if (!eventsByCategory[category]) {
        eventsByCategory[category] = [];
      }
      eventsByCategory[category].push({
        name: record.name,
        minutes,
        date: record.date,
        startTime: record.startTime,
        endTime: record.endTime
      });
    });
    
    // 生成具体事件列表文本
    const eventDetailsText = Object.entries(eventsByCategory).map(([catId, events]) => {
      const catLabel = timeCategories.find(c => c.id === catId)?.label || '待分类';
      const totalMinutes = events.reduce((sum, e) => sum + e.minutes, 0);
      const eventList = events.map(e => `    - "${e.name}" (${Math.floor(e.minutes / 60)}h${e.minutes % 60}m, ${e.date} ${e.startTime}-${e.endTime})`).join('\n');
      return `### ${catLabel} (共${(totalMinutes / 60).toFixed(1)}小时)\n${eventList}`;
    }).join('\n\n');
    
    // 构建AI提示词
    const prompt = `# Role
你是一位**注重细节的首席生活运营官 (Detail-Oriented Personal COO)**。你的核心竞争力是：**拒绝"大概印象"，坚持"穿透式审计"。** 你不看表面的分类标签，而是深入解读每一条具体的时间记录内容。

# Input Data
## 用户数据
- 时间周期：${periodLabels[currentPeriod]}（${days}天）
- 日记数量：${periodJournals.length}篇
- 时间记录总时长：${totalActualHours.toFixed(1)}小时

## 时间分配情况（实际 vs 理想）
${gaps.map(g => `- ${g.category}：实际${g.actual.toFixed(1)}h，理想${g.ideal.toFixed(1)}h，差距${g.diff > 0 ? '+' : ''}${g.diff.toFixed(1)}h`).join('\n')}

## 具体时间记录详情（按分类）
${eventDetailsText || '暂无具体时间记录'}

## 情绪记录
${Object.entries(moodCounts).length > 0 ? Object.entries(moodCounts).map(([mood, count]) => `- ${moodMap[mood] || mood}：${count}次`).join('\n') : '暂无情绪记录'}

## 日记内容摘要
${periodJournals.slice(0, 5).map(j => `- ${j.content.slice(0, 100)}${j.content.length > 100 ? '...' : ''}`).join('\n') || '暂无日记内容'}

# Core Logic (核心分析逻辑·最高优先级)
1. **🔍 强制解读具体事件 (Mandatory Event Decoding)：**
   - **指令：** 在分析任何时间块时，**必须读取并引用**计时器中记录的**【具体事件名称/备注】**。
   - **禁止：** 严禁只说"你花在生活上的时间太多"。
   - **要求：** 必须说"你花在'生活'分类下的**'准备猫饭'**和**'收纳杂物'**上的时间较多"。只有看到具体事件，才能判断这到底是"必要的维护"还是"无意义的拖延"。

2. **🏷️ 基于内容的价值重估 (Content-Based Valuation)：**
   - 不要被 App 的预设分类误导。请根据**具体做的事**重新定义价值：
   - *例子 A：* 分类是"工作"，但事件是"无意义地反复调整字体" -> 判定为**"伪工作/磨洋工"**。
   - *例子 B：* 分类是"生活"，但事件是"为家人做营养餐" -> 判定为**"高价值的后勤保障"**。
   - *例子 C：* 分类是"生活"，但事件是"修水管/照顾病号" -> 判定为**"不可抗力的突发维护"**。

3. **⚖️ 运营成本视角：**
   - 将所有非产出的琐事视为**"生活系统的运营成本"**。你的分析目标不是消灭这些时间（因为不可能），而是分析**"成本是否过高"**以及**"流程是否可以优化"**。

# Analysis Framework (审计透镜)
请依次扫描以下维度：
1. **事件成分分析：** 在"生活"或"工作"的大类下，具体是由哪些细碎任务组成的？（如：是做饭占了大头，还是通勤占了大头？）
2. **琐事颗粒度：** 这些具体事件是集中处理的，还是像碎片一样散落在全天，切碎了你的注意力？
3. **隐形负担：** 是否有某些具体事项（如"清洗猫砂盆"或"整理文件"）出现的频率过高，暗示了流程上的低效？

# Output Structure (严格按照此JSON格式输出)
{
  "eventLevelBreakdown": {
    "lifeChores": {
      "mainTimeConsumers": ["具体事件名称1", "具体事件名称2"],
      "cooEvaluation": "分析这些具体琐事的必要性。例如：'每日做饭'占据了2小时，这是高质量的自我投喂，但作为运营成本略高。"
    },
    "workOutput": {
      "coreActions": ["具体事件名称"],
      "cooEvaluation": "分析具体任务的含金量。例如：大部分时间集中在'核心代码编写'，而非'回消息'，含金量极高。"
    }
  },
  "operationalDiagnosis": {
    "currentMode": "基于具体事件定义。例如：被'家务琐事'包围的'间歇性冲刺者'。",
    "costBenefitAnalysis": "指出本周最大的时间开销（具体事件）是否带来了相应的价值（情绪价值或生存价值）？"
  },
  "processOptimization": [
    {
      "targetEvent": "某具体高耗时琐事",
      "suggestion": "例如：针对'做饭耗时久'，建议'周末备菜法'或'简化食谱'。"
    },
    {
      "targetEvent": "某具体工作习惯",
      "suggestion": "例如：发现'找素材'时间分散，建议设立专门的'素材搜集时段'。"
    }
  ]
}

# Tone
- **像拿着放大镜的审计师：** 精准、细致。
- **基于事实说话：** 哪怕是批评或表扬，都要引用具体的事件名称作为证据。
- 只返回JSON，不要其他内容`;

    setGeneratingProgress(prev => ({ ...prev, [currentPeriod]: '正在调用AI分析...' }));

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
              content: '你是一位注重细节的首席生活运营官(Detail-Oriented Personal COO)。你的核心竞争力是：拒绝"大概印象"，坚持"穿透式审计"。你不看表面的分类标签，而是深入解读每一条具体的时间记录内容。你的风格精准、细致，基于事实说话，哪怕是批评或表扬，都要引用具体的事件名称作为证据。请以JSON格式返回分析报告。'
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

      setGeneratingProgress(prev => ({ ...prev, [currentPeriod]: '正在解析AI响应...' }));
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
      report.period = periodLabels[currentPeriod];
      
      // 生成日期范围描述
      const now = new Date();
      let dateRange = '';
      if (currentPeriod === 'yesterday') {
        const yesterday = new Date(now.getTime() - 86400000);
        dateRange = `${yesterday.getMonth() + 1}月${yesterday.getDate()}日`;
      } else if (currentPeriod === 'today') {
        dateRange = `${now.getMonth() + 1}月${now.getDate()}日`;
      } else if (currentPeriod === 'week') {
        // 获取本周一
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        dateRange = `${monday.getMonth() + 1}月${monday.getDate()}日 - ${now.getMonth() + 1}月${now.getDate()}日`;
      } else {
        // 获取本月1号
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        dateRange = `${firstDay.getMonth() + 1}月${firstDay.getDate()}日 - ${now.getMonth() + 1}月${now.getDate()}日`;
      }
      
      // 保存到历史记录
      const historyEntry = {
        id: `${currentPeriod}_${now.toISOString().split('T')[0]}`,
        period: currentPeriod,
        periodLabel: periodLabels[currentPeriod],
        dateRange: dateRange,
        createdAt: now.getTime(),
        report: report
      };
      
      setReportHistory(prev => {
        const existingIndex = prev.findIndex(h => h.period === currentPeriod);
        if (existingIndex >= 0) {
          const newHistory = [...prev];
          newHistory[existingIndex] = historyEntry;
          return newHistory;
        } else {
          return [historyEntry, ...prev];
        }
      });
      
      // 从正在生成的集合中移除
      setGeneratingPeriods(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentPeriod);
        return newSet;
      });
      setGeneratingProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[currentPeriod];
        return newProgress;
      });
      
    } catch (error) {
      console.error('生成复盘报告失败:', error);
      // 从正在生成的集合中移除
      setGeneratingPeriods(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentPeriod);
        return newSet;
      });
      setGeneratingProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[currentPeriod];
        return newProgress;
      });
      const errorMessage = error instanceof Error ? error.message : 'AI复盘生成失败，请检查网络连接后重试';
      alert(errorMessage);
    }
  };
  
  // 计算真实时间分布数据
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // 根据时间周期获取记录
  const getRecordsByPeriod = (period: 'today' | 'yesterday' | 'week' | 'month') => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    
    if (period === 'today') {
      return timeRecords.filter(r => r.date === todayStr);
    } else if (period === 'yesterday') {
      // 获取昨天的日期
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;
      return timeRecords.filter(r => r.date === yesterdayStr);
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
      
      // 按名称去重（去除emoji后比较）
      const normalizedName = record.name.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '').trim();
      const existingRecord = distribution[categoryId].records.find(r => {
        const existingNormalized = r.name.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '').trim();
        return existingNormalized === normalizedName;
      });
      
      if (existingRecord) {
        existingRecord.minutes += minutes;
      } else {
        distribution[categoryId].records.push({ name: record.name, minutes });
      }
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
  
  // 按累计时间从多到少排序
  pieData.sort((a, b) => b.minutes - a.minutes);
  
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
                { id: 'yesterday', label: '昨日' },
                { id: 'week', label: '本周' },
                { id: 'month', label: '本月' }
              ].map(period => (
                <button
                  key={period.id}
                  onClick={() => {
                    setProgressPeriod(period.id as 'today' | 'yesterday' | 'week' | 'month');
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
                {progressPeriod === 'today' ? '今日' : progressPeriod === 'yesterday' ? '昨日' : progressPeriod === 'week' ? '本周' : '本月'}时间分布
              </h4>
              
              {totalMinutes === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <Clock size={32} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm">
                    {progressPeriod === 'today' ? '今日' : progressPeriod === 'yesterday' ? '昨日' : progressPeriod === 'week' ? '本周' : '本月'}暂无时间记录
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
                    
                    // 预定义的颜色数组（用于区分不同事项）
                    const itemColors = [
                      catData.color,
                      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
                      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
                      '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
                    ];
                    
                    // 生成事项饼图路径
                    const generateItemPieSlices = () => {
                      if (mergedRecords.length === 0) return [];
                      
                      const slices: Array<{ path: string; color: string; name: string; percentage: number }> = [];
                      let currentAngle = -90;
                      const cx = 80, cy = 80, r = 54;
                      
                      mergedRecords.forEach((record, idx) => {
                        const percentage = (record.minutes / catData.minutes) * 100;
                        const angle = (percentage / 100) * 360;
                        const gap = mergedRecords.length > 1 ? 2 : 0;
                        const startAngle = currentAngle + gap / 2;
                        const endAngle = currentAngle + angle - gap / 2;
                        
                        if (angle > 0.5) {
                          const startRad = (startAngle * Math.PI) / 180;
                          const endRad = (endAngle * Math.PI) / 180;
                          
                          const x1 = cx + r * Math.cos(startRad);
                          const y1 = cy + r * Math.sin(startRad);
                          const x2 = cx + r * Math.cos(endRad);
                          const y2 = cy + r * Math.sin(endRad);
                          
                          const largeArc = angle > 180 ? 1 : 0;
                          const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
                          
                          slices.push({
                            path,
                            color: itemColors[idx % itemColors.length],
                            name: record.name,
                            percentage
                          });
                        }
                        currentAngle += angle;
                      });
                      
                      return slices;
                    };
                    
                    const itemSlices = generateItemPieSlices();
                    
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
                        
                        {/* 事项饼图 */}
                        {mergedRecords.length > 0 && (
                          <div className="flex justify-center mb-4">
                            <div className="relative">
                              <svg width="160" height="160" viewBox="0 0 160 160">
                                {itemSlices.map((slice, idx) => (
                                  <path
                                    key={idx}
                                    d={slice.path}
                                    fill="none"
                                    stroke={slice.color}
                                    strokeWidth="20"
                                    strokeLinecap="butt"
                                    className="hover:opacity-80 transition-opacity"
                                  />
                                ))}
                                {/* 中心圆 */}
                                <circle cx="80" cy="80" r="38" fill="white" />
                                <text x="80" y="76" textAnchor="middle" className="text-sm font-black fill-gray-700">
                                  {mergedRecords.length}
                                </text>
                                <text x="80" y="92" textAnchor="middle" className="text-[10px] fill-gray-400">
                                  个事项
                                </text>
                              </svg>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          {mergedRecords.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">该分类下暂无记录</p>
                          ) : (
                            mergedRecords.map((record, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                              >
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: itemColors[idx % itemColors.length] }}
                                  />
                                  <span className="text-sm font-medium text-gray-700">{record.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">
                                    {((record.minutes / catData.minutes) * 100).toFixed(0)}%
                                  </span>
                                  <span className="text-sm font-bold" style={{ color: itemColors[idx % itemColors.length] }}>
                                    {record.minutes >= 60 
                                      ? `${Math.floor(record.minutes / 60)}h ${record.minutes % 60}m`
                                      : `${record.minutes}m`
                                    }
                                  </span>
                                  {selectedCategory === 'uncategorized' && (
                                    <select
                                      value="uncategorized"
                                      onChange={(e) => {
                                        const newCategoryId = e.target.value as CategoryId;
                                        const recordName = record.name;
                                        
                                        // 更新所有同名的timeRecords
                                        setTimeRecords(timeRecords.map(r => 
                                          r.name === recordName ? { ...r, categoryId: newCategoryId } : r
                                        ));
                                        
                                        // 更新所有同名的globalTimers
                                        setGlobalTimers(prev => prev.map(t => 
                                          t.name === recordName ? { ...t, categoryId: newCategoryId } : t
                                        ));
                                      }}
                                      className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-600 outline-none focus:border-sky-300"
                                    >
                                      <option value="uncategorized">选择分类</option>
                                      {timeCategories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                          {cat.icon} {cat.label}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
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
                            strokeLinecap="butt"
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
                    {/* 按累计时间从多到少排序显示分类 */}
                    {[...timeCategories]
                      .map(cat => {
                        const item = pieData.find(p => p.id === cat.id);
                        return { ...cat, minutes: item?.minutes || 0 };
                      })
                      .sort((a, b) => b.minutes - a.minutes)
                      .map(cat => {
                      // 从 pieData 中查找该分类的数据，如果没有则使用默认值
                      const item = pieData.find(p => p.id === cat.id);
                      const minutes = item?.minutes || 0;
                      const percentage = item?.percentage || 0;
                      
                      // 计算理想时间（根据时间周期，使用已发生的天数）
                      const today = new Date();
                      let daysInPeriod = 1;
                      if (progressPeriod === 'week') {
                        // 本周已发生的天数（周一为1）
                        const dayOfWeek = today.getDay();
                        daysInPeriod = dayOfWeek === 0 ? 7 : dayOfWeek; // 周日算第7天
                      } else if (progressPeriod === 'month') {
                        // 本月已发生的天数
                        daysInPeriod = today.getDate();
                      }
                      const idealHoursPerDay = idealTimeAllocation[cat.id] || 0;
                      const idealMinutes = idealHoursPerDay * 60 * daysInPeriod;
                      const progressPercent = idealMinutes > 0 ? Math.min((minutes / idealMinutes) * 100, 100) : 0;
                      
                      return (
                        <button
                          key={cat.id}
                          onClick={() => minutes > 0 && setSelectedCategory(cat.id)}
                          className={`w-full p-3 rounded-xl bg-gray-50 transition-all text-left ${minutes > 0 ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-60 cursor-default'}`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-sm">{cat.icon}</span>
                              <span className="text-sm font-bold text-gray-700">{cat.label}</span>
                              <span className="text-xs text-gray-400 ml-1">{percentage.toFixed(0)}%</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {minutes >= 60 
                                ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
                                : `${minutes}m`
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
                            {minutes > 0 && <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />}
                          </div>
                          {/* 进度条 - 始终显示 */}
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F0F4F8' }}>
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${progressPercent}%`,
                                backgroundColor: cat.color
                              }}
                            />
                          </div>
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
                  onClick={() => { setAiPeriod(period.id); setViewingHistoryReport(null); }}
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
                    
                    {/* 🕵️ 现场级成分分析 */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                          <span className="text-lg">🕵️</span>
                        </div>
                        <h4 className="font-black text-gray-800 text-lg">现场级成分分析</h4>
                      </div>
                      
                      {/* 生活/琐事板块 */}
                      <div className="mb-4">
                        <h5 className="font-bold text-gray-700 mb-2">🏠 生活/琐事板块拆解</h5>
                        <div className="bg-purple-50 rounded-xl p-3">
                          {viewingHistoryReport.eventLevelBreakdown?.lifeChores?.mainTimeConsumers && (
                            <p className="text-xs text-purple-600 mb-2">
                              主要耗时项：{Array.isArray(viewingHistoryReport.eventLevelBreakdown.lifeChores.mainTimeConsumers) 
                                ? viewingHistoryReport.eventLevelBreakdown.lifeChores.mainTimeConsumers.map((item: string) => `【${item}】`).join('、')
                                : viewingHistoryReport.eventLevelBreakdown.lifeChores.mainTimeConsumers}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ 
                            __html: (viewingHistoryReport.eventLevelBreakdown?.lifeChores?.cooEvaluation || viewingHistoryReport.executiveSummary?.patternDefinition || viewingHistoryReport.summary?.energyAudit || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-700">$1</strong>') 
                          }} />
                        </div>
                      </div>
                      
                      {/* 工作/产出板块 */}
                      <div>
                        <h5 className="font-bold text-gray-700 mb-2">💼 工作/产出板块拆解</h5>
                        <div className="bg-orange-50 rounded-xl p-3">
                          {viewingHistoryReport.eventLevelBreakdown?.workOutput?.coreActions && (
                            <p className="text-xs text-orange-600 mb-2">
                              核心动作：{Array.isArray(viewingHistoryReport.eventLevelBreakdown.workOutput.coreActions) 
                                ? viewingHistoryReport.eventLevelBreakdown.workOutput.coreActions.map((item: string) => `【${item}】`).join('、')
                                : viewingHistoryReport.eventLevelBreakdown.workOutput.coreActions}
                            </p>
                          )}
                          <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                            __html: (viewingHistoryReport.eventLevelBreakdown?.workOutput?.cooEvaluation || viewingHistoryReport.executiveSummary?.coreConflict || viewingHistoryReport.summary?.positiveSignal || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-orange-700">$1</strong>') 
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* 📊 运营模式诊断 */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                          <span className="text-lg">📊</span>
                        </div>
                        <h4 className="font-black text-gray-800 text-lg">运营模式诊断</h4>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-amber-50 rounded-xl p-3">
                          <p className="text-xs font-bold text-amber-600 mb-1">🎭 当前模式</p>
                          <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                            __html: (viewingHistoryReport.operationalDiagnosis?.currentMode || viewingHistoryReport.fiveLensAudit?.roiAnalysis || viewingHistoryReport.summary?.negativeSignal || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-700">$1</strong>') 
                          }} />
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3">
                          <p className="text-xs font-bold text-blue-600 mb-1">⚖️ 成本/收益分析</p>
                          <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                            __html: (viewingHistoryReport.operationalDiagnosis?.costBenefitAnalysis || viewingHistoryReport.fiveLensAudit?.energyAndRhythm || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-700">$1</strong>') 
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* 🛠 流程优化建议 */}
                    <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl p-5 border-2 border-sky-100">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center">
                          <span className="text-lg">🛠</span>
                        </div>
                        <h4 className="font-black text-sky-800 text-lg">流程优化建议</h4>
                      </div>
                      
                      <div className="space-y-3">
                        {Array.isArray(viewingHistoryReport.processOptimization) ? (
                          viewingHistoryReport.processOptimization.map((item: { targetEvent: string; suggestion: string }, index: number) => (
                            <div key={index} className="bg-white/60 rounded-xl p-3">
                              <p className="text-xs font-bold text-sky-600 mb-1">🎯 针对「{item.targetEvent}」</p>
                              <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                                __html: (item.suggestion || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-700">$1</strong>') 
                              }} />
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="bg-white/60 rounded-xl p-3">
                              <p className="text-xs font-bold text-amber-600 mb-1">🔮 三个月后的心理画像</p>
                              <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                                __html: (viewingHistoryReport.threeMonthProjection?.mindsetChange || viewingHistoryReport.advice?.threeMonthWarning || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-700">$1</strong>') 
                              }} />
                            </div>
                            <div className="bg-white/60 rounded-xl p-3">
                              <p className="text-xs font-bold text-sky-600 mb-1">🛡️ 最需守护的三件事</p>
                              <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                                __html: (viewingHistoryReport.actionGuide?.threeThingsToProtect || (viewingHistoryReport.advice?.protections || []).join('；') || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-700">$1</strong>') 
                              }} />
                            </div>
                            <div className="bg-white/60 rounded-xl p-3">
                              <p className="text-xs font-bold text-sky-600 mb-1">🔧 "懒人"调仓建议</p>
                              <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                                __html: (viewingHistoryReport.actionGuide?.lazyRebalancing || viewingHistoryReport.advice?.adjustment || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-700">$1</strong>') 
                              }} />
                            </div>
                          </>
                        )}
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
            ) : generatingPeriods.has(aiPeriod) ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-black text-sky-600 mb-3">{generatingProgress[aiPeriod] || '正在生成...'}</h3>
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
                {/* 报告头部 - 显示时间周期、时间范围和重新生成按钮 */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-700">
                      {reportData.period || aiPeriods.find(p => p.id === aiPeriod)?.label}复盘报告
                    </span>
                    <span className="text-xs text-gray-400">
                      {reportHistory.find(h => h.period === aiPeriod)?.dateRange || ''}
                    </span>
                  </div>
                  <button
                    onClick={generateReport}
                    disabled={generatingPeriods.has(aiPeriod)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={generatingPeriods.has(aiPeriod) ? 'animate-spin' : ''} />
                    {generatingPeriods.has(aiPeriod) ? '生成中...' : '重新生成'}
                  </button>
                </div>

                {/* ===== 🕵️ 现场级成分分析 ===== */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                      <span className="text-lg">🕵️</span>
                    </div>
                    <h4 className="font-black text-gray-800 text-lg">现场级成分分析</h4>
                  </div>
                  
                  {/* 生活/琐事板块 */}
                  <div className="mb-4">
                    <h5 className="font-bold text-gray-700 mb-2">🏠 生活/琐事板块拆解</h5>
                    <div className="bg-purple-50 rounded-xl p-3">
                      {reportData.eventLevelBreakdown?.lifeChores?.mainTimeConsumers && (
                        <p className="text-xs text-purple-600 mb-2">
                          主要耗时项：{Array.isArray(reportData.eventLevelBreakdown.lifeChores.mainTimeConsumers) 
                            ? reportData.eventLevelBreakdown.lifeChores.mainTimeConsumers.map((item: string) => `【${item}】`).join('、')
                            : reportData.eventLevelBreakdown.lifeChores.mainTimeConsumers}
                        </p>
                      )}
                      <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                        __html: (reportData.eventLevelBreakdown?.lifeChores?.cooEvaluation || reportData.executiveSummary?.patternDefinition || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-700">$1</strong>') 
                      }} />
                    </div>
                  </div>
                  
                  {/* 工作/产出板块 */}
                  <div>
                    <h5 className="font-bold text-gray-700 mb-2">💼 工作/产出板块拆解</h5>
                    <div className="bg-orange-50 rounded-xl p-3">
                      {reportData.eventLevelBreakdown?.workOutput?.coreActions && (
                        <p className="text-xs text-orange-600 mb-2">
                          核心动作：{Array.isArray(reportData.eventLevelBreakdown.workOutput.coreActions) 
                            ? reportData.eventLevelBreakdown.workOutput.coreActions.map((item: string) => `【${item}】`).join('、')
                            : reportData.eventLevelBreakdown.workOutput.coreActions}
                        </p>
                      )}
                      <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                        __html: (reportData.eventLevelBreakdown?.workOutput?.cooEvaluation || reportData.executiveSummary?.coreConflict || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-orange-700">$1</strong>') 
                      }} />
                    </div>
                  </div>
                </div>

                {/* ===== 📊 运营模式诊断 ===== */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <span className="text-lg">📊</span>
                    </div>
                    <h4 className="font-black text-gray-800 text-lg">运营模式诊断</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-amber-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-amber-600 mb-1">🎭 当前模式</p>
                      <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                        __html: (reportData.operationalDiagnosis?.currentMode || reportData.fiveLensAudit?.roiAnalysis || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-700">$1</strong>') 
                      }} />
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-blue-600 mb-1">⚖️ 成本/收益分析</p>
                      <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                        __html: (reportData.operationalDiagnosis?.costBenefitAnalysis || reportData.fiveLensAudit?.energyAndRhythm || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-700">$1</strong>') 
                      }} />
                    </div>
                  </div>
                </div>

                {/* ===== 🛠 流程优化建议 ===== */}
                <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl p-5 border-2 border-sky-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center">
                      <span className="text-lg">🛠</span>
                    </div>
                    <h4 className="font-black text-sky-800 text-lg">流程优化建议</h4>
                  </div>

                  <div className="space-y-3">
                    {Array.isArray(reportData.processOptimization) ? (
                      reportData.processOptimization.map((item: { targetEvent: string; suggestion: string }, index: number) => (
                        <div key={index} className="bg-white/60 rounded-xl p-3">
                          <p className="text-xs font-bold text-sky-600 mb-1">🎯 针对「{item.targetEvent}」</p>
                          <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                            __html: (item.suggestion || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-700">$1</strong>') 
                          }} />
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="bg-white/60 rounded-xl p-3">
                          <p className="text-xs font-bold text-emerald-600 mb-1">🛡️ 最需守护的三件事</p>
                          <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                            __html: (reportData.actionGuide?.threeThingsToProtect || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-600">$1</strong>') 
                          }} />
                        </div>
                        <div className="bg-white/60 rounded-xl p-3">
                          <p className="text-xs font-bold text-sky-600 mb-1">🔧 "懒人"调仓建议</p>
                          <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ 
                            __html: (reportData.actionGuide?.lazyRebalancing || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-600">$1</strong>') 
                          }} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm mb-6">点击下方按钮生成{aiPeriods.find(p => p.id === aiPeriod)?.label}的AI复盘报告</p>
                <Button 
                  onClick={generateReport}
                  disabled={generatingPeriods.has(aiPeriod)}
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
                            setEventSearchQuery('');
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
                setEventSearchQuery('');
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
                
                {/* 搜索框 */}
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={eventSearchQuery}
                    onChange={(e) => setEventSearchQuery(e.target.value)}
                    placeholder="搜索事件名称..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-sky-300"
                  />
                  {eventSearchQuery && (
                    <button
                      onClick={() => setEventSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                {/* 事件选择列表 */}
                <div className="border border-gray-200 rounded-xl max-h-32 overflow-y-auto">
                  {(() => {
                    const filteredEvents = uniqueEventNames.filter(name => 
                      name.toLowerCase().includes(eventSearchQuery.toLowerCase())
                    );
                    
                    if (uniqueEventNames.length === 0) {
                      return <p className="text-xs text-gray-400 p-3 text-center">暂无可关联的事件</p>;
                    }
                    
                    if (filteredEvents.length === 0) {
                      return <p className="text-xs text-gray-400 p-3 text-center">未找到匹配的事件</p>;
                    }
                    
                    return filteredEvents.map(name => (
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
                    ));
                  })()}
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
  tasks: Array<{id: string, name: string, duration: number, categoryId?: CategoryId}>;
  setTasks: React.Dispatch<React.SetStateAction<Array<{id: string, name: string, duration: number, categoryId?: CategoryId}>>>;
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
  mentalStatus: 'energetic' | 'normal' | 'tired' | 'anxious' | 'nervous' | 'sad' | 'angry' | 'addicted';
  setMentalStatus: (status: 'energetic' | 'normal' | 'tired' | 'anxious' | 'nervous' | 'sad' | 'angry' | 'addicted') => void;
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
  
  // 用于滚动到正在计时的任务
  const activeTaskRef = useRef<HTMLDivElement>(null);
  const hasScrolledToActiveTask = useRef(false);
  
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
  // 番茄钟等待进入下一阶段的状态
  const [pomodoroWaitingNextPhase, setPomodoroWaitingNextPhase] = useState(false);
  // 下一阶段信息
  const [nextPhaseInfo, setNextPhaseInfo] = useState<{ phase: 'work' | 'break' | 'longBreak'; round: number } | null>(null);
  
  // 计时模式选择弹窗
  const [showTimerModeModal, setShowTimerModeModal] = useState(false);
  const [pendingTimerTask, setPendingTimerTask] = useState<{id: string, duration: number, name: string, hasPomodoroSlots?: boolean, categoryId?: CategoryId} | null>(null);
  const [selectedTimerTab, setSelectedTimerTab] = useState<'countup' | 'countdown' | 'pomodoro'>('countup');
  const [_showPomodoroSettings, setShowPomodoroSettings] = useState(false);
  const [_showCountdownSettings, setShowCountdownSettings] = useState(false);
  const [countdownDuration, setCountdownDuration] = useState(25);
  
  // 切换计时确认弹窗
  const [showSwitchTimerConfirm, setShowSwitchTimerConfirm] = useState(false);
  const [pendingSwitchTask, setPendingSwitchTask] = useState<{id: string, duration: number, name: string, pomodoroSlots?: any[], categoryId?: CategoryId} | null>(null);
  
  // 编辑模式状态
  const [isEditMode, setIsEditMode] = useState(false);
  
  // 新增事项弹窗状态（编辑模式下）
  const [showAddScheduleItemModal, setShowAddScheduleItemModal] = useState(false);
  const [newScheduleItemName, setNewScheduleItemName] = useState('');
  const [newScheduleItemDuration, setNewScheduleItemDuration] = useState(30);
  
  // 编辑任务状态
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskDuration, setEditTaskDuration] = useState(25);
  
  // 新添加任务的飞入动画状态
  const [flyingTaskId, setFlyingTaskId] = useState<string | null>(null);
  
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
    angry: ['讨厌原生家庭', '讨厌自己', '讨厌老板同事'],
    addicted: ['沉迷抖音', '沉迷游戏', '沉迷看电视', '沉迷伪兴趣']
  };

  // 是否已恢复计时器状态
  const hasRestoredPlanTimer = useRef(false);
  
  // 防止重复保存记录的标志
  const lastSavedPlanRecordKey = useRef<string | null>(null);

  // 从localStorage恢复计时器状态
  useEffect(() => {
    // 只恢复一次
    if (hasRestoredPlanTimer.current) return;
    
    const persistentState = loadPersistentTimerState();
    if (persistentState?.planTimer && persistentState.planTimer.status !== 'idle') {
      hasRestoredPlanTimer.current = true;
      const { planTimer } = persistentState;
      
      if (planTimer.startTimestamp) {
        // 恢复计时器模式和配置
        setTimerMode(planTimer.timerMode);
        if (planTimer.countdownDuration) {
          setCountdownDuration(planTimer.countdownDuration); // 恢复倒计时时长
        }
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
            // 计时已完成，先保存记录再播放铃声
            // 根据时间戳计算开始时间
            const startTime = new Date(planTimer.startTimestamp);
            if (planTimer.taskName) {
              // 直接构造记录并保存，避免依赖状态
              const endTime = new Date();
              const formatTimeStr = (date: Date) => {
                return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
              };
              const formatDateStr = (date: Date) => {
                return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
              };
              // 查找该事项是否已有分类
              const existingCategory = findExistingCategory(planTimer.taskName, timeRecords, globalTimers);
              const newRecord: TimeRecord = {
                id: `plan_timer_restore_${Date.now()}`,
                name: planTimer.taskName,
                date: formatDateStr(startTime),
                startTime: formatTimeStr(startTime),
                endTime: formatTimeStr(endTime),
                source: 'timer',
                categoryId: existingCategory,
                createdAt: Date.now()
              };
              console.log('PlanView 恢复时保存记录:', newRecord);
              setTimeRecords(prev => [...prev, newRecord]);
            }
            
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
            // 关键修复：恢复 timerStartTime，用于后续保存记录
            setTimerStartTime(new Date(planTimer.startTimestamp));
            setElapsedTime(elapsed);
            setRemainingTime(calcRemaining);
            setTimerStatus('running');
            // 标记需要滚动到正在计时的任务
            hasScrolledToActiveTask.current = false;
          }
        } else if (planTimer.status === 'paused' && planTimer.pausedAt !== null) {
          // 恢复暂停状态
          // 关键修复：恢复 timerStartTime
          setTimerStartTime(new Date(planTimer.startTimestamp));
          if (planTimer.timerMode === 'countup') {
            setElapsedTime(planTimer.pausedAt);
          } else {
            setRemainingTime(planTimer.pausedAt);
          }
          setTimerStatus('paused');
          // 标记需要滚动到正在计时的任务
          hasScrolledToActiveTask.current = false;
        }
      }
    }
  }, []);

  // 滚动到正在计时的任务
  useEffect(() => {
    if (activeTimerId && !hasScrolledToActiveTask.current && (timerStatus === 'running' || timerStatus === 'paused')) {
      // 延迟执行，确保 DOM 已渲染
      setTimeout(() => {
        if (activeTaskRef.current) {
          activeTaskRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          hasScrolledToActiveTask.current = true;
        }
      }, 300);
    }
  }, [activeTimerId, timerStatus]);

  // 保存计时器状态到localStorage
  useEffect(() => {
    if (timerStatus === 'running' || timerStatus === 'paused') {
      const persistentState = loadPersistentTimerState() || { focusTimer: null, planTimer: null };
      
      // 计算正确的totalDuration
      let totalDuration = 0;
      if (timerMode === 'countup') {
        totalDuration = 0;
      } else if (timerMode === 'countdown') {
        totalDuration = countdownDuration * 60;
      } else if (timerMode === 'pomodoro') {
        // 番茄钟模式：根据当前阶段计算时长
        totalDuration = pomodoroPhase === 'work' 
          ? pomodoroConfig.workDuration * 60 
          : pomodoroPhase === 'break' 
          ? pomodoroConfig.breakDuration * 60 
          : pomodoroConfig.longBreakDuration * 60;
      }
      
      const planTimerState = {
        activeTimerId,
        timerMode,
        countdownDuration, // 保存倒计时时长
        startTimestamp: timerStartTimestamp,
        pausedAt: timerStatus === 'paused' 
          ? (timerMode === 'countup' ? elapsedTime : remainingTime)
          : null,
        totalDuration,
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
          // 正计时模式 - 基于时间戳实时计算
          if (timerStartTimestamp) {
            const elapsed = Math.floor((Date.now() - timerStartTimestamp) / 1000);
            setElapsedTime(elapsed);
          } else {
            setElapsedTime(prev => prev + 1);
          }
        } else if (timerMode === 'countdown') {
          // 倒计时模式 - 基于时间戳计算剩余时间
          if (timerStartTimestamp) {
            const elapsed = Math.floor((Date.now() - timerStartTimestamp) / 1000);
            const newRemaining = Math.max(0, countdownDuration * 60 - elapsed);
            
            if (newRemaining <= 0) {
              // 倒计时结束，保存记录（传入当前值避免闭包问题）
              saveTimeRecord(timerStartTime || undefined, currentTaskName || undefined);
              setTimerStatus('idle');
              setActiveTimerId(null);
              // 倒计时结束，播放铃声
              alarmPlayer.play(10000);
              setIsAlarmPlaying(true);
              setTimeout(() => setIsAlarmPlaying(false), 10000);
              setRemainingTime(0);
              setTimerStartTime(null);
              setCurrentTaskName('');
            } else {
              setRemainingTime(newRemaining);
            }
          }
        } else if (timerMode === 'pomodoro') {
          // 番茄钟模式 - 基于时间戳计算剩余时间
          if (timerStartTimestamp) {
            const elapsed = Math.floor((Date.now() - timerStartTimestamp) / 1000);
            const phaseDuration = pomodoroPhase === 'work' 
              ? pomodoroConfig.workDuration * 60 
              : pomodoroPhase === 'break' 
              ? pomodoroConfig.breakDuration * 60 
              : pomodoroConfig.longBreakDuration * 60;
            const newRemaining = Math.max(0, phaseDuration - elapsed);
            
            if (newRemaining <= 0 && !pomodoroWaitingNextPhase) {
              // 当前阶段结束，播放铃声提醒，暂停等待用户确认
              alarmPlayer.play(10000);
              setIsAlarmPlaying(true);
              setPomodoroWaitingNextPhase(true);
              setTimerStatus('paused');
              setRemainingTime(0);
              
              // 计算下一阶段信息
              if (pomodoroPhase === 'work') {
                if (currentPomodoroRound >= pomodoroConfig.rounds) {
                  setNextPhaseInfo({ phase: 'longBreak', round: 1 });
                } else {
                  setNextPhaseInfo({ phase: 'break', round: currentPomodoroRound });
                }
              } else if (pomodoroPhase === 'break') {
                setNextPhaseInfo({ phase: 'work', round: currentPomodoroRound + 1 });
              } else {
                // 长休息结束，整个番茄钟周期完成
                setNextPhaseInfo(null);
              }
            } else if (!pomodoroWaitingNextPhase) {
              setRemainingTime(newRemaining);
            }
          }
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerStatus, timerMode, pomodoroPhase, currentPomodoroRound, pomodoroConfig, timerStartTimestamp, countdownDuration, pomodoroWaitingNextPhase, timerStartTime, currentTaskName]);

  // 监听页面可见性变化，确保后台返回时检查计时器状态
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerStatus === 'running' && timerStartTimestamp) {
        // 页面重新可见，立即检查计时器状态
        if (timerMode === 'countdown') {
          const elapsed = Math.floor((Date.now() - timerStartTimestamp) / 1000);
          const initialDuration = countdownDuration * 60;
          const newRemaining = Math.max(0, initialDuration - elapsed);
          if (newRemaining <= 0) {
            // 计算结束了多久
            const endedSecondsAgo = elapsed - initialDuration;
            // 只在结束后10秒内播放铃声
            if (endedSecondsAgo <= 10) {
              alarmPlayer.play(10000 - endedSecondsAgo * 1000);
              setIsAlarmPlaying(true);
              setTimeout(() => setIsAlarmPlaying(false), 10000 - endedSecondsAgo * 1000);
            }
          }
        } else if (timerMode === 'pomodoro') {
          const elapsed = Math.floor((Date.now() - timerStartTimestamp) / 1000);
          const phaseDuration = pomodoroPhase === 'work' 
            ? pomodoroConfig.workDuration * 60 
            : pomodoroPhase === 'break' 
            ? pomodoroConfig.breakDuration * 60 
            : pomodoroConfig.longBreakDuration * 60;
          const newRemaining = Math.max(0, phaseDuration - elapsed);
          if (newRemaining <= 0) {
            // 计算结束了多久
            const endedSecondsAgo = elapsed - phaseDuration;
            // 只在结束后10秒内播放铃声
            if (endedSecondsAgo <= 10) {
              alarmPlayer.play(10000 - endedSecondsAgo * 1000);
              setIsAlarmPlaying(true);
              setTimeout(() => setIsAlarmPlaying(false), 10000 - endedSecondsAgo * 1000);
            }
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerStatus, timerStartTimestamp, timerMode, countdownDuration, pomodoroPhase, pomodoroConfig]);

  // 更新标签页标题显示计时器状态
  useEffect(() => {
    if (timerStatus === 'running') {
      const timeValue = timerMode === 'countup' ? elapsedTime : remainingTime;
      const taskName = currentTaskName || '计时中';
      updateDocumentTitle(taskName, timeValue, timerMode, pomodoroPhase, true);
    } else {
      updateDocumentTitle(null, 0, 'countdown', undefined, false);
    }
    
    // 组件卸载时恢复原标题
    return () => {
      document.title = ORIGINAL_TITLE;
    };
  }, [timerStatus, currentTaskName, remainingTime, elapsedTime, timerMode, pomodoroPhase]);

  // 打开计时模式选择弹窗
  const openTimerModeModal = (taskId: string, duration: number, taskName: string, pomodoroSlots?: any[], categoryId?: CategoryId) => {
    // 检查是否有正在进行的计时
    if (timerStatus === 'running' || timerStatus === 'paused') {
      // 如果点击的是当前正在计时的任务，不做任何操作
      if (activeTimerId === taskId) return;
      
      // 显示确认弹窗
      setPendingSwitchTask({ id: taskId, duration, name: taskName, pomodoroSlots, categoryId });
      setShowSwitchTimerConfirm(true);
      return;
    }
    
    // 没有正在进行的计时，直接打开模式选择弹窗
    openTimerModeModalDirect(taskId, duration, taskName, pomodoroSlots, categoryId);
  };
  
  // 直接打开计时模式选择弹窗（不检查当前计时状态）
  const openTimerModeModalDirect = (taskId: string, duration: number, taskName: string, pomodoroSlots?: any[], categoryId?: CategoryId) => {
    const hasPomodoroSlots = pomodoroSlots && pomodoroSlots.length > 0;
    setPendingTimerTask({ id: taskId, duration, name: taskName, hasPomodoroSlots, categoryId });
    // 设置默认倒计时时长为AI计划的时长
    setCountdownDuration(duration);
    setShowCountdownSettings(false);
    // 如果任务有番茄钟配置，默认选中番茄钟 tab
    if (hasPomodoroSlots) {
      setSelectedTimerTab('pomodoro');
      // 从AI生成的番茄钟配置中推断参数
      setPomodoroConfig({
        workDuration: pomodoroSettings.workDuration,
        breakDuration: pomodoroSettings.breakDuration,
        rounds: pomodoroSlots!.length,
        longBreakDuration: pomodoroSettings.longBreakDuration
      });
      setShowPomodoroSettings(true);
    } else {
      setSelectedTimerTab('countup');
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
    
    // 优先使用任务自带的分类，否则查找已有分类
    const taskCategory = pendingTimerTask.categoryId && pendingTimerTask.categoryId !== 'uncategorized' 
      ? pendingTimerTask.categoryId 
      : findExistingCategory(pendingTimerTask.name, timeRecords, globalTimers);
    
    // 添加计时器到全局计时器列表，按名称去重（移除emoji后比较）
    const normalizedName = removeEmoji(pendingTimerTask.name);
    const existingTimer = globalTimers.find(t => removeEmoji(t.name) === normalizedName);
    if (!existingTimer) {
      const newTimer: Timer = {
        id: `plan_${Date.now()}`,
        name: pendingTimerTask.name,
        icon: '📋',
        categoryId: taskCategory,
        duration: mode === 'countdown' ? countdownDuration : pendingTimerTask.duration,
        remainingTime: (mode === 'countdown' ? countdownDuration : pendingTimerTask.duration) * 60,
        status: 'running',
        createdAt: Date.now()
      };
      setGlobalTimers([...globalTimers, newTimer]);
    } else if (taskCategory !== 'uncategorized' && existingTimer.categoryId !== taskCategory) {
      // 如果已有计时器但分类不同，更新分类
      setGlobalTimers(globalTimers.map(t => 
        t.id === existingTimer.id ? { ...t, categoryId: taskCategory } : t
      ));
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
  const saveTimeRecord = (startTimeParam?: Date | null, taskNameParam?: string) => {
    const startTime = startTimeParam;
    const taskName = taskNameParam;
    
    if (!startTime || !taskName) {
      console.log('saveTimeRecord: 缺少必要参数', { startTime, taskName });
      return;
    }
    
    // 生成唯一键，防止重复保存
    const recordKey = `${taskName}_${startTime.getTime()}`;
    if (lastSavedPlanRecordKey.current === recordKey) {
      console.log('PlanView saveTimeRecord: 跳过重复保存', recordKey);
      return;
    }
    lastSavedPlanRecordKey.current = recordKey;
    
    const endTime = new Date();
    const formatTimeStr = (date: Date) => {
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };
    const formatDateStr = (date: Date) => {
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    };
    
    // 查找该事项是否已有分类
    const existingCategory = findExistingCategory(taskName, timeRecords, globalTimers);
    
    const newRecord: TimeRecord = {
      id: `plan_timer_${Date.now()}`,
      name: taskName,
      date: formatDateStr(startTime),
      startTime: formatTimeStr(startTime),
      endTime: formatTimeStr(endTime),
      source: 'timer',
      categoryId: existingCategory,
      createdAt: Date.now()
    };
    
    console.log('PlanView saveTimeRecord: 保存记录', newRecord);
    setTimeRecords(prev => [...prev, newRecord]);
  };

  // 开始计时（旧方法保留兼容）
  const startTimer = (taskId: string, duration: number, taskName: string, pomodoroSlots?: any[], categoryId?: CategoryId) => {
    // 解锁音频（移动端需要在用户交互时触发）
    alarmPlayer.unlock();
    openTimerModeModal(taskId, duration, taskName, pomodoroSlots, categoryId);
  };
  
  // 确认切换计时（停止当前计时，开始新计时）
  const confirmSwitchTimer = () => {
    if (!pendingSwitchTask) return;
    
    // 保存当前计时记录
    if (timerStartTime && currentTaskName) {
      saveTimeRecord(timerStartTime, currentTaskName);
    }
    
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
      pendingSwitchTask.pomodoroSlots,
      pendingSwitchTask.categoryId
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

  // 停止响铃并进入番茄钟下一阶段
  const stopAlarmAndProceed = () => {
    alarmPlayer.stop();
    setIsAlarmPlaying(false);
    
    // 如果是番茄钟等待下一阶段
    if (pomodoroWaitingNextPhase && nextPhaseInfo) {
      setPomodoroWaitingNextPhase(false);
      
      if (nextPhaseInfo.phase === 'longBreak') {
        // 工作阶段结束，进入长休息前保存记录
        if (timerStartTime && currentTaskName) {
          saveTimeRecord(timerStartTime, currentTaskName);
        }
        setPomodoroPhase('longBreak');
        setCurrentPomodoroRound(1);
        setRemainingTime(pomodoroConfig.longBreakDuration * 60);
        setTimerStartTimestamp(Date.now());
        setTimerStatus('running');
      } else if (nextPhaseInfo.phase === 'break') {
        // 工作阶段结束，进入短休息前保存记录
        if (timerStartTime && currentTaskName) {
          saveTimeRecord(timerStartTime, currentTaskName);
        }
        setPomodoroPhase('break');
        setRemainingTime(pomodoroConfig.breakDuration * 60);
        setTimerStartTimestamp(Date.now());
        setTimerStatus('running');
      } else if (nextPhaseInfo.phase === 'work') {
        // 休息阶段结束，进入工作阶段，重置开始时间
        setPomodoroPhase('work');
        setCurrentPomodoroRound(nextPhaseInfo.round);
        setRemainingTime(pomodoroConfig.workDuration * 60);
        setTimerStartTime(new Date());
        setTimerStartTimestamp(Date.now());
        setTimerStatus('running');
      }
      setNextPhaseInfo(null);
    } else if (pomodoroWaitingNextPhase && !nextPhaseInfo) {
      // 长休息结束，整个番茄钟周期完成（休息阶段不保存记录）
      setPomodoroWaitingNextPhase(false);
      setTimerStatus('idle');
      setActiveTimerId(null);
      setPomodoroPhase('work');
      setCurrentPomodoroRound(1);
      setRemainingTime(0);
      setTimerStartTime(null);
      setCurrentTaskName('');
    }
  };

  // 停止计时
  const stopTimer = () => {
    // 保存计时记录（如果有开始时间）
    // 正计时、倒计时都保存，番茄钟只保存工作阶段
    if (timerStartTime && currentTaskName) {
      if (timerMode !== 'pomodoro' || pomodoroPhase === 'work') {
        saveTimeRecord(timerStartTime, currentTaskName);
      }
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
      // 保存工作阶段的记录
      if (timerStartTime && currentTaskName) {
        saveTimeRecord(timerStartTime, currentTaskName);
      }
      
      if (currentPomodoroRound >= pomodoroConfig.rounds) {
        // 已经是最后一轮，直接完成番茄钟
        setTimerStatus('idle');
        setActiveTimerId(null);
        setRemainingTime(0);
        setPomodoroPhase('work');
        setCurrentPomodoroRound(1);
        setTimerStartTime(null);
        setCurrentTaskName('');
        return;
      } else {
        // 进入短休息
        setPomodoroPhase('break');
        setRemainingTime(pomodoroConfig.breakDuration * 60);
        // 重置开始时间（休息阶段不计入记录）
        setTimerStartTimestamp(Date.now());
      }
    } else if (pomodoroPhase === 'break') {
      // 当前是短休息，跳到下一轮专注
      setPomodoroPhase('work');
      setCurrentPomodoroRound(prev => prev + 1);
      setRemainingTime(pomodoroConfig.workDuration * 60);
      // 重置开始时间（新的工作阶段）
      setTimerStartTime(new Date());
      setTimerStartTimestamp(Date.now());
    } else {
      // 当前是长休息，完成番茄钟（休息阶段不保存记录）
      setTimerStatus('idle');
      setActiveTimerId(null);
      setRemainingTime(0);
      setPomodoroPhase('work');
      setCurrentPomodoroRound(1);
      setTimerStartTime(null);
      setCurrentTaskName('');
    }
  };

  // 格式化剩余时间，正计时始终显示时分秒
  const formatRemainingTime = (seconds: number, alwaysShowHours: boolean = false) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (alwaysShowHours || hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  // 新增事项（编辑模式下）
  const addScheduleItem = () => {
    if (!scheduleData || !newScheduleItemName.trim()) return;
    
    // 创建新事项，添加到列表末尾
    const newItem = {
      id: `manual_${Date.now()}`,
      name: newScheduleItemName.trim(),
      duration: newScheduleItemDuration,
      type: 'pomodoro',
      start: 0, // 临时值，保存时会重新计算
      end: 0,
      advice: ''
    };
    
    const newSchedule = [...scheduleData.schedule, newItem];
    setScheduleData({ ...scheduleData, schedule: newSchedule });
    
    // 重置表单
    setNewScheduleItemName('');
    setNewScheduleItemDuration(30);
    setShowAddScheduleItemModal(false);
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

  // AI 自动分类任务
  const classifyTaskWithAI = async (taskName: string): Promise<CategoryId> => {
    // 首先检查是否已有相同名称的任务分类
    const existingCategory = findExistingCategory(taskName, timeRecords, globalTimers);
    if (existingCategory !== 'uncategorized') {
      return existingCategory;
    }
    
    // 使用 AI 进行分类
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
              content: `你是一个任务分类助手。根据任务名称，将其分类到以下类别之一：
- work: 工作相关（如开会、写报告、处理邮件等）
- study: 学习相关（如看书、上课、做作业、背单词等）
- sleep: 睡眠相关（如午睡、小憩等）
- life: 生活相关（如做饭、打扫、购物、洗衣服等）
- rest: 休息相关（如冥想、发呆、散步等）
- entertainment: 娱乐相关（如看电影、玩游戏、刷视频等）
- health: 健康相关（如运动、健身、看医生等）
- hobby: 兴趣爱好（如画画、弹琴、摄影等）

只返回分类ID，不要返回其他内容。如果无法确定，返回 uncategorized。`
            },
            {
              role: 'user',
              content: `请对以下任务进行分类：${taskName}`
            }
          ],
          temperature: 0.3,
          max_tokens: 50,
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        const category = data.choices?.[0]?.message?.content?.trim().toLowerCase() as CategoryId;
        const validCategories: CategoryId[] = ['work', 'study', 'sleep', 'life', 'rest', 'entertainment', 'health', 'hobby'];
        if (validCategories.includes(category)) {
          return category;
        }
      }
    } catch (error) {
      console.error('AI分类失败:', error);
    }
    
    return 'uncategorized';
  };

  const addTask = (name: string, duration: number = 25, categoryId?: CategoryId) => {
    if (name.trim()) {
      const newTaskId = Date.now().toString();
      const newTask = {
        id: newTaskId,
        name: name.trim(),
        duration,
        categoryId: categoryId || 'uncategorized' as CategoryId
      };
      
      setTasks([...tasks, newTask]);
      setNewTaskName('');
      setNewTaskDuration(25);
      
      // 触发飞入动画
      setFlyingTaskId(newTaskId);
      setTimeout(() => setFlyingTaskId(null), 600);
      
      // 异步进行 AI 分类（如果没有指定分类）
      if (!categoryId) {
        classifyTaskWithAI(name.trim()).then(aiCategory => {
          setTasks(prevTasks => prevTasks.map(t => 
            t.id === newTaskId ? { ...t, categoryId: aiCategory } : t
          ));
        });
      }
    }
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateTask = (id: string, name: string, duration: number, categoryId?: CategoryId) => {
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, name: name.trim(), duration, ...(categoryId !== undefined && { categoryId }) } : t
    ));
  };

  const startEditTask = (task: {id: string, name: string, duration: number, categoryId?: CategoryId}) => {
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
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // 调用进度回调
      onProgress?.(content);
      
      return content;
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
      
      const tasksText = tasks.map(task => {
        const categoryLabel = task.categoryId && task.categoryId !== 'uncategorized' 
          ? `[分类:${task.categoryId}]` 
          : '';
        return `${task.name}(${task.duration}分钟)${categoryLabel}`;
      }).join('、');
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
        angry: '感到生气',
        addicted: '沉迷状态'
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
      const needsComfort = ['tired', 'anxious', 'nervous', 'sad', 'angry', 'addicted'].includes(mentalStatus);

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
7. 【重要】对于duration超过40分钟的任务，必须提供pomodoroSlots字段！这是强制要求，不能省略。pomodoroSlots是一个数组，包含多个番茄钟时间段，每个时间段包含workStart、workEnd、breakEnd、isLongBreak四个字段
8. 任务名称必须保持用户输入的原始名称，不要添加"第x部分"、"Part x"等后缀
${needsComfort ? `9. 由于用户当前状态不佳（${mentalDetailText}），你需要扮演**神经行为与生理效能工程师**的角色，进行精准分诊并给出针对性阻断指令。

【核心分诊逻辑·必须严格遵守】
在给出建议前，必须先进行"状态定性"，严禁张冠李戴：

**类型A：多巴胺陷阱 (Dopamine Trap)**
- 触发词：沉迷、伪兴趣、无聊刷手机、拖延、不想动
- 诊断：前额叶失控，大脑被低成本高刺激的多巴胺挟持
- ❌ 错误解法：喝水、拉伸、深呼吸（大脑根本听不进去）
- ✅ 正确解法（增加摩擦力）：切断信号源或环境隔离，如"手机屏幕调成黑白"、"把手机扔到视线外"

**类型B：生理高唤醒/过载 (Physiological Overload)**
- 触发词：焦虑、生气、紧张、惊恐、失眠
- 诊断：交感神经飙升，杏仁核劫持
- ✅ 正确解法（生理降温）：用"冷水泼脸"、"屏息"、"死挂"等物理手段强制降温

**类型C：生理低唤醒/枯竭 (Physiological Depletion)**
- 触发词：疲惫、浑身疼、眼睛酸、脑雾、姨妈痛
- 诊断：能量耗尽，肌肉僵硬
- ✅ 正确解法（物理修复）：局部热敷、特定肌肉拉伸、闭目养神

在comfortSection字段中提供以下内容：
- words: 针对性阻断指令，包含状态判定和立刻执行的动作。格式："【状态判定：xxx】具体指令..."
- actionTip: 行为替换/环境重塑，防止复发的配套动作
- breathingTip: 生效原理，一句话解释为什么这个方法有效
- 语气精准打击，不要给沉迷的人推拿，不要给疼痛的人讲大道理` : ''}

请以JSON格式返回，格式如下：
{
  ${needsComfort ? `"comfortSection": {
    "words": ["【状态判定：多巴胺挟持】物理隔离法——立刻把手机扔到沙发的另一头，或者把屏幕亮度调到最低并开启黑白模式"],
    "actionTip": "五分钟发呆测试：什么都不做，只盯着墙壁看。如果你觉得难受，说明你的多巴胺阈值太高了，忍受这种无聊就是治疗",
    "breathingTip": "黑白屏幕剥夺了色彩刺激，让大脑瞬间觉得'没意思'，从而切断多巴胺渴求回路"
  },` : ''}
  "schedule": [
    {
      "id": "task1",
      "name": "短任务示例",
      "start": "09:00",
      "end": "09:30", 
      "duration": 30,
      "type": "pomodoro",
      "icon": "🎯",
      "advice": "执行该任务的简短建议"
    },
    {
      "id": "task2",
      "name": "长任务示例（超过40分钟必须有pomodoroSlots）",
      "start": "10:00",
      "end": "12:00", 
      "duration": 120,
      "type": "pomodoro",
      "icon": "💻",
      "advice": "专注工作，每轮结束后起身活动",
      "pomodoroSlots": [
        {"workStart": "10:00", "workEnd": "10:25", "breakEnd": "10:30", "isLongBreak": false},
        {"workStart": "10:30", "workEnd": "10:55", "breakEnd": "11:00", "isLongBreak": false},
        {"workStart": "11:00", "workEnd": "11:25", "breakEnd": "11:30", "isLongBreak": false},
        {"workStart": "11:30", "workEnd": "11:55", "breakEnd": "12:00", "isLongBreak": false}
      ]
    }
  ]
}

【强制规则】：
- advice字段必须为每个任务提供
- 当任务duration >= 40分钟时，pomodoroSlots字段是【必填】的，不能省略！
- pomodoroSlots数组中每个对象必须包含：workStart、workEnd、breakEnd、isLongBreak
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
          
          // 尝试修复被截断的 JSON
          // 计算括号平衡
          let braceCount = 0;
          let bracketCount = 0;
          for (const char of cleanJson) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            if (char === '[') bracketCount++;
            if (char === ']') bracketCount--;
          }
          
          // 如果括号不平衡，尝试截断到最后一个完整的 schedule 项
          if (braceCount > 0 || bracketCount > 0) {
            console.log('检测到 JSON 不完整，尝试修复...');
            // 找到 schedule 数组的开始位置
            const scheduleStart = cleanJson.indexOf('"schedule"');
            if (scheduleStart !== -1) {
              // 找到最后一个完整的对象（以 } 结尾，后面跟着 , 或 ]）
              const lastCompleteItem = cleanJson.lastIndexOf('},');
              const lastCompleteItemAlt = cleanJson.lastIndexOf('}]');
              const lastComplete = Math.max(lastCompleteItem, lastCompleteItemAlt);
              
              if (lastComplete > scheduleStart) {
                // 截断到最后一个完整项
                cleanJson = cleanJson.substring(0, lastComplete + 1);
                // 补全括号
                while (bracketCount > 0) {
                  cleanJson += ']';
                  bracketCount--;
                }
                while (braceCount > 0) {
                  cleanJson += '}';
                  braceCount--;
                }
                console.log('JSON 修复完成');
              }
            }
          }
          
          parsedSchedule = JSON.parse(cleanJson);
        } else {
          throw new Error('无法从AI响应中提取JSON');
        }
        
        // 验证必要字段
        if (!parsedSchedule.schedule || !Array.isArray(parsedSchedule.schedule)) {
          throw new Error('AI响应缺少schedule字段');
        }
        
        // 过滤掉不完整的 schedule 项
        parsedSchedule.schedule = parsedSchedule.schedule.filter((item: any) => {
          return item && item.name && item.start && item.end && typeof item.duration === 'number';
        });
        
        if (parsedSchedule.schedule.length === 0) {
          throw new Error('AI响应中没有有效的任务');
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
        <div className="absolute -right-10 top-10 w-40 h-40 rounded-full bg-orange-50 blur-2xl opacity-50"></div>
        <div className="absolute -left-10 bottom-20 w-32 h-32 rounded-full bg-amber-50 blur-xl opacity-40"></div>
        
        <div className="text-center z-10 flex flex-col items-center justify-center">
          <h3 className="text-xl font-black mb-2" style={{ color: '#B066F5' }}>AI 正在规划中...</h3>
          <p className="text-gray-500 text-sm mb-8">DeepSeek正在为你制定最佳时间安排</p>
          
          {/* 加载动画 */}
          <div className="flex justify-center gap-1 mb-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: '#B066F5', animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          
          <div className="text-xs text-gray-400 space-y-1 text-center">
            <div>📋 分析你的{tasks.length}个任务</div>
            <div>🍽️ 考虑生活习惯安排</div>
            <div>⚡ 根据{
              mentalStatus === 'energetic' ? '充沛' : 
              mentalStatus === 'normal' ? '正常' : 
              mentalStatus === 'tired' ? '疲惫' :
              mentalStatus === 'anxious' ? '焦虑' :
              mentalStatus === 'nervous' ? '紧张' :
              mentalStatus === 'sad' ? '伤心' : 
              mentalStatus === 'addicted' ? '沉迷' : '生气'
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
      <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #FFFAF0 0%, #FFFFFF 100%)' }}>
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
              className="font-bold p-2 -mr-2"
              style={{ color: '#B066F5' }}
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        {/* 编辑模式提示 */}
        {isEditMode && (
          <div className="mx-6 mb-4 bg-blue-50 rounded-2xl p-3 border border-blue-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-600 font-medium flex-1">
                📝 可调整顺序、删除事项，或新增事项
              </p>
              <button
                onClick={() => setShowAddScheduleItemModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-full hover:bg-blue-600 transition-all"
              >
                <Plus size={14} />
                新增
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* 神经效能干预卡片 */}
          {scheduleData.comfortSection && (
            <div className="rounded-3xl p-5 mb-6 relative overflow-hidden border border-white/50 shadow-sm" style={{ backgroundColor: '#FFF3E0' }}>
              <div className="absolute top-3 right-3 opacity-30">
                <Heart size={32} className="text-[#FFAB91]" />
              </div>
              <div className="relative z-10">
                {/* 针对性阻断 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">⚡️</span>
                  <h3 className="text-sm font-black text-[#5D4037]">针对性阻断</h3>
                </div>
                <div className="space-y-3 mb-4">
                  {scheduleData.comfortSection.words?.map((word: string, index: number) => (
                    <p key={index} className="text-sm leading-relaxed pl-4 border-l-2" style={{ color: '#5D4037', borderLeftColor: '#FFAB91' }}>
                      {word}
                    </p>
                  ))}
                </div>
                
                {/* 行为替换/环境重塑 */}
                {scheduleData.comfortSection.actionTip && (
                  <div className="flex items-start gap-2 mb-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,171,145,0.2)' }}>
                    <span className="text-base">🔄</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#5D4037] mb-1">行为替换</h4>
                      <p className="text-sm text-[#5D4037]">{scheduleData.comfortSection.actionTip}</p>
                    </div>
                  </div>
                )}
                
                {/* 生效原理 */}
                {scheduleData.comfortSection.breathingTip && (
                  <div className="flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,171,145,0.2)' }}>
                    <span className="text-base">🧠</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#5D4037] mb-1">生效原理</h4>
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
                // 修复跨天判断：
                // 1. 如果任务结束时间在凌晨（0-6点），且当前时间在晚上（18点后），不应该判断为已过期
                // 2. 如果任务开始时间在晚上，结束时间在凌晨，说明是跨凌晨任务
                // 3. 跨凌晨的任务在当天晚上和第二天凌晨都不应该置灰
                const startHour = new Date(item.start).getHours();
                const endHour = new Date(item.end).getHours();
                const currentHour = new Date(now).getHours();
                
                // 判断是否是跨凌晨任务（开始时间在晚上18点后，或结束时间在凌晨6点前）
                const isOvernightTask = (startHour >= 18 && endHour < 6) || // 开始在晚上，结束在凌晨
                                        (endHour < 6 && currentHour >= 18) || // 结束在凌晨，当前在晚上
                                        (endHour < 6 && currentHour < 6); // 结束在凌晨，当前也在凌晨
                
                const isPast = !isOvernightTask && item.end < now;
                const isLast = index === totalItems - 1;
                
                // 判断是否需要在此任务前插入时间线（跨天任务不参与时间线判断）
                const prevItem = index > 0 ? scheduleData.schedule[index - 1] : null;
                const prevEndHour = prevItem ? new Date(prevItem.end).getHours() : 0;
                const prevStartHour = prevItem ? new Date(prevItem.start).getHours() : 0;
                const prevIsOvernight = prevItem && ((prevStartHour >= 18 && prevEndHour < 6) || 
                                                     (prevEndHour < 6 && currentHour >= 18) ||
                                                     (prevEndHour < 6 && currentHour < 6));
                const prevIsPast = prevItem && !prevIsOvernight && prevItem.end < now;
                const itemIsOvernight = (startHour >= 18 && endHour < 6) || (startHour < 6 && currentHour >= 18) || (startHour < 6 && currentHour < 6);
                const shouldInsertTimeline = !timelineInserted && !isPast && (prevItem ? prevIsPast : true) && !itemIsOvernight && item.start > now;
                if (shouldInsertTimeline) timelineInserted = true;
                
                return (
                  <div key={taskId} className="relative" ref={isActive ? activeTaskRef : undefined}>
                    {/* 当前时间线 */}
                    {shouldInsertTimeline && (
                      <div className="flex items-center gap-3 py-2 mb-5">
                        <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: '#B066F5', boxShadow: '0 0 10px rgba(176, 102, 245, 0.5)' }}></div>
                        <div className="flex-1 h-[2px]" style={{ background: 'linear-gradient(to right, #B066F5, transparent)' }}></div>
                        <span className="text-xs font-bold whitespace-nowrap" style={{ color: '#B066F5' }}>
                          现在 {new Date().getHours().toString().padStart(2, '0')}:{new Date().getMinutes().toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}
                    
                    <div 
                      className={`rounded-3xl shadow-sm border-2 transition-all overflow-hidden ${
                        isActive ? 'shadow-lg' : isEditMode ? 'border-blue-200' : 'border-gray-50'
                      } ${isPast && !isEditMode ? 'opacity-50' : ''}`}
                      style={isActive ? { borderColor: '#B066F5' } : {}}
                    >
                  {/* 顶部时间横条 */}
                  <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: '#F8E8FF' }}>
                    <span className="text-sm font-bold" style={{ color: '#5E35B1' }}>
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
                    <div className="mb-4 p-4 rounded-2xl" style={{ background: 'linear-gradient(to right, #F8E8FF, #EEF2FF)' }}>
                      <div className="text-center">
                        {/* 模式标签 */}
                        <div className="flex justify-center mb-2">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            timerMode === 'countup' ? 'bg-blue-100 text-blue-600' :
                            timerMode === 'pomodoro' ? 'bg-red-100 text-red-600' :
                            ''
                          }`}
                          style={timerMode === 'countdown' ? { backgroundColor: '#F8E8FF', color: '#B066F5' } : {}}>
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
                          {timerMode === 'countup' ? formatRemainingTime(elapsedTime, true) : formatRemainingTime(remainingTime)}
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
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all"
                              style={{ backgroundColor: '#B066F5' }}
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
                              onClick={() => stopAlarmAndProceed()}
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
                        onClick={() => {
                          // 查找任务对应的分类
                          const taskInList = tasks.find(t => t.name === item.name || removeEmoji(t.name) === removeEmoji(item.name));
                          const categoryId = taskInList?.categoryId || findExistingCategory(item.name, timeRecords, globalTimers);
                          startTimer(taskId, item.duration, item.name, item.pomodoroSlots, categoryId);
                        }}
                        className="rounded-[18px] px-[14px] py-[6px] text-[13px] font-bold transition-all hover:opacity-80"
                        style={{ 
                          backgroundColor: '#F8E8FF',
                          border: '1px solid #B066F5',
                          color: '#B066F5'
                        }}
                      >
                        开始计时
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
                  className="w-[70%] shadow-[0_8px_0_0_#8B5CF6] hover:shadow-[0_6px_0_0_#8B5CF6] hover:translate-y-[2px] active:shadow-none active:translate-y-[8px]"
                  style={{ 
                    background: 'linear-gradient(135deg, #B066F5 0%, #9575CD 100%)',
                    boxShadow: '0 10px 25px rgba(176, 102, 245, 0.4)',
                    color: '#FFFFFF' 
                  }}
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
                style={{ borderColor: '#B066F5', color: '#B066F5' }}
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
                  style={{ backgroundColor: '#B066F5' }}
                >
                  切换任务
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 新增事项弹窗（编辑模式下） */}
        {showAddScheduleItemModal && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowAddScheduleItemModal(false);
              setNewScheduleItemName('');
              setNewScheduleItemDuration(30);
            }}
          >
            <div 
              className="bg-white rounded-3xl p-6 w-full max-w-sm"
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-black text-[#2D3436] mb-4 text-center">新增事项</h3>
              
              {/* 事项名称 */}
              <div className="mb-4">
                <label className="text-sm font-bold text-gray-600 block mb-2">事项名称</label>
                <input
                  type="text"
                  value={newScheduleItemName}
                  onChange={(e) => setNewScheduleItemName(e.target.value)}
                  placeholder="输入事项名称"
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
                  autoFocus
                />
              </div>
              
              {/* 时长选择 */}
              <div className="mb-4">
                <label className="text-sm font-bold text-gray-600 block mb-2">预计时长</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="5"
                    max="240"
                    step="5"
                    value={newScheduleItemDuration}
                    onChange={(e) => setNewScheduleItemDuration(Number(e.target.value))}
                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #60a5fa 0%, #3b82f6 100%)`,
                      outline: 'none'
                    }}
                  />
                  <span className="text-sm font-black text-blue-600 w-16 text-right">
                    {newScheduleItemDuration >= 60 
                      ? `${Math.floor(newScheduleItemDuration / 60)}h${newScheduleItemDuration % 60 > 0 ? newScheduleItemDuration % 60 + 'm' : ''}`
                      : `${newScheduleItemDuration}min`
                    }
                  </span>
                </div>
              </div>
              
              {/* 快捷时长选择 */}
              <div className="flex gap-2 flex-wrap mb-6">
                {[15, 30, 45, 60, 90, 120].map(duration => (
                  <button
                    key={duration}
                    onClick={() => setNewScheduleItemDuration(duration)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      newScheduleItemDuration === duration
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    {duration >= 60 ? `${duration / 60}h` : `${duration}min`}
                  </button>
                ))}
              </div>
              
              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddScheduleItemModal(false);
                    setNewScheduleItemName('');
                    setNewScheduleItemDuration(30);
                  }}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={addScheduleItem}
                  disabled={!newScheduleItemName.trim()}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#3b82f6' }}
                >
                  添加
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
                    timerMode === 'countdown' ? 'bg-white text-[#B066F5] shadow-sm' : 'text-gray-500'
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
                  <div className="p-4 rounded-2xl" style={{ backgroundColor: '#F8E8FF' }}>
                    <div className="text-center mb-4">
                      <div className="text-4xl mb-2">⏳</div>
                      <div className="font-bold text-lg" style={{ color: '#B066F5' }}>倒计时模式</div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">倒计时时长</span>
                        <span className="text-lg font-bold" style={{ color: '#B066F5' }}>{countdownDuration} 分钟</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="180"
                        value={countdownDuration}
                        onChange={(e) => setCountdownDuration(Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #B066F5 0%, #B066F5 ${(countdownDuration / 180) * 100}%, #E0AAFF ${(countdownDuration / 180) * 100}%, #E0AAFF 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>1分</span>
                        <span>180分</span>
                      </div>
                      <button
                        onClick={() => confirmStartTimer('countdown')}
                        className="w-full mt-2 py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all"
                        style={{ backgroundColor: '#B066F5' }}
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

        {/* 浮动停止响铃按钮 - 铃声响起时显示 */}
        {isAlarmPlaying && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
            <button
              onClick={() => stopAlarmAndProceed()}
              className="px-6 py-3 rounded-full bg-pink-500 text-white font-bold shadow-lg hover:bg-pink-600 transition-all animate-pulse flex items-center gap-2"
              style={{ boxShadow: '0 10px 30px rgba(236, 72, 153, 0.4)' }}
            >
              <span className="text-xl">🔔</span>
              <span>停止响铃</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #FFFAF0 0%, #FFFFFF 100%)' }}>
      {/* 背景装饰 */}
      <div className="absolute -right-10 top-10 w-40 h-40 rounded-full bg-orange-50 blur-2xl opacity-50"></div>
      <div className="absolute -left-10 bottom-40 w-32 h-32 rounded-full bg-amber-50 blur-xl opacity-40"></div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 z-10">
        {/* 头部 - 随页面滚动 */}
        <div className="pt-8 pb-4 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black mb-4" style={{ color: '#5D4E68', fontWeight: 700 }}>
                {(() => {
                  const now = new Date();
                  const month = now.getMonth() + 1;
                  const date = now.getDate();
                  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                  const weekday = weekdays[now.getDay()];
                  return `${month}月${date}日 · ${weekday}`;
                })()}
              </h2>
            </div>
            <p className="font-medium" style={{ color: '#9C8DA5', fontSize: '14px' }}>
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

        {/* 七彩分类进度条 */}
        {tasks.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500">任务分类时间分布</span>
              <span className="text-xs text-gray-400">
                共 {tasks.reduce((sum, t) => sum + t.duration, 0)} 分钟
              </span>
            </div>
            {/* 进度条 */}
            <div className="h-3 rounded-full overflow-hidden flex bg-gray-100">
              {(() => {
                const categoryTotals: Record<string, number> = {};
                const totalDuration = tasks.reduce((sum, t) => sum + t.duration, 0);
                
                tasks.forEach(task => {
                  const catId = task.categoryId || 'uncategorized';
                  categoryTotals[catId] = (categoryTotals[catId] || 0) + task.duration;
                });
                
                const categoryColors: Record<string, string> = {
                  work: '#FF8CA1',
                  study: '#FFD23F',
                  sleep: '#6CB6FF',
                  life: '#B589F6',
                  rest: '#42D4A4',
                  entertainment: '#FF9F1C',
                  health: '#22d3ee',
                  hobby: '#f472b6',
                  uncategorized: '#9ca3af'
                };
                
                const categoryLabels: Record<string, string> = {
                  work: '工作',
                  study: '学习',
                  sleep: '睡眠',
                  life: '生活',
                  rest: '休息',
                  entertainment: '娱乐',
                  health: '健康',
                  hobby: '兴趣',
                  uncategorized: '待分类'
                };
                
                // 按累计时间从多到少排序
                const sortedCategories = Object.entries(categoryTotals)
                  .sort(([, a], [, b]) => b - a);
                
                return sortedCategories.map(([catId, duration]) => {
                  const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
                  return (
                    <div
                      key={catId}
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: categoryColors[catId] || '#9ca3af',
                        minWidth: percentage > 0 ? '4px' : '0'
                      }}
                      title={`${categoryLabels[catId] || catId}: ${duration}分钟 (${percentage.toFixed(1)}%)`}
                    />
                  );
                });
              })()}
            </div>
            {/* 图例 */}
            <div className="flex flex-wrap gap-2 mt-3">
              {(() => {
                const categoryTotals: Record<string, number> = {};
                tasks.forEach(task => {
                  const catId = task.categoryId || 'uncategorized';
                  categoryTotals[catId] = (categoryTotals[catId] || 0) + task.duration;
                });
                
                const categoryColors: Record<string, string> = {
                  work: '#FF8CA1',
                  study: '#FFD23F',
                  sleep: '#6CB6FF',
                  life: '#B589F6',
                  rest: '#42D4A4',
                  entertainment: '#FF9F1C',
                  health: '#22d3ee',
                  hobby: '#f472b6',
                  uncategorized: '#9ca3af'
                };
                
                const categoryLabels: Record<string, string> = {
                  work: '工作',
                  study: '学习',
                  sleep: '睡眠',
                  life: '生活',
                  rest: '休息',
                  entertainment: '娱乐',
                  health: '健康',
                  hobby: '兴趣',
                  uncategorized: '待分类'
                };
                
                // 按累计时间从多到少排序
                const sortedCategories = Object.entries(categoryTotals)
                  .sort(([, a], [, b]) => b - a);
                
                return sortedCategories.map(([catId, duration]) => (
                  <div key={catId} className="flex items-center gap-1">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: categoryColors[catId] || '#9ca3af' }}
                    />
                    <span className="text-[10px] text-gray-500">
                      {categoryLabels[catId] || catId} {duration}min
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
        {/* 添加任务 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-5 shadow-sm mb-6">
          <div className="mb-4">
            {tasks.map((task, index) => (
              <div 
                key={task.id} 
                className={`flex items-center gap-3 py-3 ${index < tasks.length - 1 ? 'border-b' : ''} ${
                  flyingTaskId === task.id ? 'animate-fly-in' : ''
                }`}
                style={flyingTaskId === task.id ? {
                  animation: 'flyIn 0.5s ease-out forwards'
                } : {}}
              >
                {editingTaskId === task.id ? (
                  // 编辑模式
                  <>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={editTaskName}
                        onChange={(e) => setEditTaskName(e.target.value)}
                        className="w-full bg-white rounded-lg px-3 py-2 text-sm outline-none border-2 focus:ring-2"
                        style={{ borderColor: '#E0AAFF' }}
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
                        <span className="text-xs font-bold whitespace-nowrap" style={{ color: '#B066F5' }}>时长</span>
                        <input
                          type="range"
                          min="1"
                          max="360"
                          value={editTaskDuration}
                          onChange={(e) => setEditTaskDuration(Number(e.target.value))}
                          className="flex-1 h-1 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #E0AAFF 0%, #B066F5 100%)`,
                            outline: 'none'
                          }}
                        />
                        <span className="text-xs font-bold w-16 text-right" style={{ color: '#B066F5' }}>
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
                        className="p-1 transition-colors hover:opacity-80"
                        style={{ color: '#B066F5' }}
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
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-semibold text-[#2D3436]">{task.name}</span>
                        <span className="text-sm font-bold" style={{ color: '#B066F5' }}>
                          {task.duration >= 60 
                            ? `${Math.floor(task.duration / 60)}h${task.duration % 60 > 0 ? task.duration % 60 + 'm' : ''}`
                            : `${task.duration}min`
                          }
                        </span>
                      </div>
                      {/* 分类选择器 */}
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {[
                          { id: 'work', label: '工作', color: '#FF8CA1' },
                          { id: 'study', label: '学习', color: '#FFD23F' },
                          { id: 'life', label: '生活', color: '#B589F6' },
                          { id: 'rest', label: '休息', color: '#42D4A4' },
                          { id: 'entertainment', label: '娱乐', color: '#FF9F1C' },
                          { id: 'health', label: '健康', color: '#22d3ee' },
                          { id: 'hobby', label: '兴趣', color: '#f472b6' },
                        ].map(cat => {
                          const isSelected = task.categoryId === cat.id;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => updateTask(task.id, task.name, task.duration, cat.id as CategoryId)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                                isSelected 
                                  ? 'text-white shadow-sm' 
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                              style={isSelected ? { backgroundColor: cat.color } : {}}
                            >
                              {cat.label}
                            </button>
                          );
                        })}
                        {(!task.categoryId || task.categoryId === 'uncategorized') && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-500 animate-pulse">
                            AI分类中...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => startEditTask(task)}
                        className="p-1 transition-colors hover:opacity-80"
                        style={{ color: '#B066F5' }}
                        title="编辑"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => removeTask(task.id)}
                        className="p-1 transition-colors hover:text-red-400"
                        style={{ color: '#E0AAFF' }}
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
              className="w-full rounded-xl px-4 py-3 text-base outline-none border focus:ring-2 shadow-sm resize-none"
              style={{ 
                borderColor: '#E0AAFF',
                backgroundColor: '#FFFFFF'
              }}
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
              <span className="text-sm font-bold whitespace-nowrap" style={{ color: '#B066F5' }}>预计时长</span>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="360"
                  value={newTaskDuration}
                  onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #E0AAFF 0%, #B066F5 100%)`,
                    outline: 'none'
                  }}
                />
                <span className="text-sm font-black w-20 text-right" style={{ color: '#B066F5' }}>
                  {newTaskDuration >= 60 
                    ? `${Math.floor(newTaskDuration / 60)}h${newTaskDuration % 60 > 0 ? newTaskDuration % 60 + 'm' : ''}`
                    : `${newTaskDuration}min`
                  }
                </span>
              </div>
            </div>

            {/* 快捷时长选择 */}
            <div className="flex gap-2 flex-wrap">
              {[15, 30, 60, 120, 180, 240].map(duration => {
                const isSelected = newTaskDuration === duration && !newTaskName.trim();
                return (
                  <button
                    key={duration}
                    onClick={() => {
                      if (newTaskName.trim()) {
                        // 输入框有内容时，直接添加任务
                        addTask(newTaskName, duration);
                      } else {
                        // 输入框为空时，只设置时长
                        setNewTaskDuration(duration);
                      }
                    }}
                    className="px-3 py-1 rounded-full text-xs font-bold transition-all border"
                    style={isSelected ? {
                      backgroundColor: '#B066F5',
                      color: '#FFFFFF',
                      borderColor: '#B066F5',
                      boxShadow: '0 4px 10px rgba(176, 102, 245, 0.3)'
                    } : {
                      backgroundColor: '#FFFFFF',
                      color: '#B066F5',
                      borderColor: '#E0AAFF'
                    }}
                  >
                    {duration >= 60 ? `${duration / 60}h` : `${duration}min`}
                  </button>
                );
              })}
            </div>

            {/* 添加按钮 */}
            <button 
              onClick={() => {
                if (newTaskName.trim()) {
                  addTask(newTaskName, newTaskDuration);
                }
              }}
              disabled={!newTaskName.trim()}
              className="w-full h-12 rounded-xl flex items-center justify-center font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2"
              style={{ 
                borderColor: '#E0AAFF',
                backgroundColor: '#F8E8FF',
                color: '#B066F5'
              }}
            >
              <Plus size={20} className="mr-2" />
              添加任务
            </button>
          </div>
        </div>

        {/* 状态设置（折叠组） */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6">
          <h3 className="font-black text-[#2D3436] flex items-center gap-2">
            <Brain size={20} style={{ color: '#B066F5' }} />
            状态设置
          </h3>
          
          {!isStatusSectionExpanded ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-3">
                设置当下"身体/精神状态"，AI为你贴身打造今日计划
              </p>
              <button 
                onClick={() => setIsStatusSectionExpanded(true)}
                className="inline-flex items-center gap-1 text-xs font-bold transition-colors hover:opacity-80"
                style={{ color: '#B066F5' }}
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
                          ? 'border-2'
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                      style={lifestyle[item.key as keyof typeof lifestyle] ? {
                        backgroundColor: '#F8E8FF',
                        borderColor: '#E0AAFF',
                        color: '#B066F5'
                      } : {}}
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
                    { id: 'angry', label: '生气', emoji: '😠', color: '#f87171' },
                    { id: 'addicted', label: '沉迷', emoji: '📱', color: '#a78bfa' }
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
          className="font-bold"
          style={{ 
            background: 'linear-gradient(135deg, #B066F5 0%, #9B4DE0 100%)',
            boxShadow: '0 10px 25px rgba(176, 102, 245, 0.4)',
            color: '#FFFFFF'
          }}
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
            
            {/* Tab 切换 */}
            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-2xl">
              <button
                onClick={() => setSelectedTimerTab('countup')}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                  selectedTimerTab === 'countup' 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                ⏱️ 正计时
              </button>
              <button
                onClick={() => setSelectedTimerTab('countdown')}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                  selectedTimerTab === 'countdown' 
                    ? 'bg-green-500 text-white shadow-md' 
                    : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                ⏳ 倒计时
              </button>
              <button
                onClick={() => setSelectedTimerTab('pomodoro')}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all relative ${
                  selectedTimerTab === 'pomodoro' 
                    ? 'bg-red-500 text-white shadow-md' 
                    : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                🍅 番茄钟
                {pendingTimerTask?.hasPomodoroSlots && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
                )}
              </button>
            </div>
            
            {/* 内容区域 */}
            <div className="mb-6">
              {selectedTimerTab === 'countup' && (
                <div className="p-4 rounded-2xl border-2 border-blue-200 bg-blue-50">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                      <Timer size={24} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-[#2D2D2D]">正计时模式</div>
                      <div className="text-xs text-gray-500">从0开始计时，记录实际用时</div>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedTimerTab === 'countdown' && (
                <div className="p-4 rounded-2xl border-2 border-green-200 bg-green-50">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center text-white">
                      <Clock size={24} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-[#2D2D2D]">倒计时模式</div>
                      <div className="text-xs text-gray-500">按计划时长 {pendingTimerTask?.duration} 分钟倒计时</div>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedTimerTab === 'pomodoro' && (
                <div className="p-4 rounded-2xl border-2 border-red-200 bg-red-50">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center text-white">
                      <Target size={24} />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-bold text-[#2D2D2D]">番茄钟模式</div>
                      <div className="text-xs text-gray-500">专注与休息交替进行</div>
                    </div>
                    {pendingTimerTask?.hasPomodoroSlots && (
                      <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded-full">AI推荐</span>
                    )}
                  </div>
                  
                  {/* 番茄钟参数设置 */}
                  <div className="mt-4 pt-4 border-t border-red-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">专注时长</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPomodoroConfig(prev => ({ ...prev, workDuration: Math.max(5, prev.workDuration - 5) }))}
                          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                        >-</button>
                        <span className="w-12 text-center font-bold text-[#2D2D2D]">{pomodoroConfig.workDuration}分</span>
                        <button
                          onClick={() => setPomodoroConfig(prev => ({ ...prev, workDuration: Math.min(180, prev.workDuration + 5) }))}
                          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                        >+</button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">休息时长</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPomodoroConfig(prev => ({ ...prev, breakDuration: Math.max(1, prev.breakDuration - 1) }))}
                          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                        >-</button>
                        <span className="w-12 text-center font-bold text-[#2D2D2D]">{pomodoroConfig.breakDuration}分</span>
                        <button
                          onClick={() => setPomodoroConfig(prev => ({ ...prev, breakDuration: Math.min(30, prev.breakDuration + 1) }))}
                          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                        >+</button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">轮数</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPomodoroConfig(prev => ({ ...prev, rounds: Math.max(1, prev.rounds - 1) }))}
                          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                        >-</button>
                        <span className="w-12 text-center font-bold text-[#2D2D2D]">{pomodoroConfig.rounds}轮</span>
                        <button
                          onClick={() => setPomodoroConfig(prev => ({ ...prev, rounds: Math.min(10, prev.rounds + 1) }))}
                          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                        >+</button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">长休息</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPomodoroConfig(prev => ({ ...prev, longBreakDuration: Math.max(5, prev.longBreakDuration - 5) }))}
                          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                        >-</button>
                        <span className="w-12 text-center font-bold text-[#2D2D2D]">{pomodoroConfig.longBreakDuration}分</span>
                        <button
                          onClick={() => setPomodoroConfig(prev => ({ ...prev, longBreakDuration: Math.min(60, prev.longBreakDuration + 5) }))}
                          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                        >+</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* 开始按钮 */}
            <button
              onClick={() => confirmStartTimer(selectedTimerTab)}
              className={`w-full py-3 rounded-2xl text-white font-bold mb-3 transition-all ${
                selectedTimerTab === 'countup' ? 'bg-blue-500 hover:bg-blue-600' :
                selectedTimerTab === 'countdown' ? 'bg-green-500 hover:bg-green-600' :
                'bg-red-500 hover:bg-red-600'
              }`}
            >
              开始计时
            </button>
            
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
  setJournals,
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
  setJournals: React.Dispatch<React.SetStateAction<Journal[]>>;
  idealTimeAllocation: Record<string, number>;
  setIdealTimeAllocation: (allocation: Record<string, number>) => void;
  globalTimers: Timer[];
  setGlobalTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPomodoroModal, setShowPomodoroModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'calendar' | 'journal' | null>(null);
  const [showDataManageModal, setShowDataManageModal] = useState(false);
  const [showDataMenuModal, setShowDataMenuModal] = useState(false);
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
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  
  // 搜索数据源
  const [dataSearchQuery, setDataSearchQuery] = useState('');
  // 是否已经初始定位过
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);
  
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

  // 导出日记为 JSON 格式（用于备份和重新导入）
  const exportJournalAsJson = () => {
    const startDate = new Date(exportStartDate);
    const endDate = new Date(exportEndDate);
    endDate.setHours(23, 59, 59, 999);

    const filteredJournals = journals.filter(j => {
      const journalDate = new Date(j.date);
      return journalDate >= startDate && journalDate <= endDate;
    });

    if (filteredJournals.length === 0) {
      showToastMessage('所选时间范围内没有日记');
      return;
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      exportRange: { start: exportStartDate, end: exportEndDate },
      journals: filteredJournals
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `日记备份_${exportStartDate}_${exportEndDate}.json`;
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
DESCRIPTION:来源: ${record.source === 'timer' ? '计时器' : record.source === 'manual' ? '手动' : '导入'}
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

  // 合并记录：同一时间段的新数据覆盖旧数据
  const mergeRecords = (existingRecords: TimeRecord[], newRecords: TimeRecord[]) => {
    // 创建一个 Map，key 为 "日期_开始时间_结束时间"
    const recordMap = new Map<string, TimeRecord>();
    
    // 先添加现有记录
    existingRecords.forEach(record => {
      const key = `${record.date}_${record.startTime}_${record.endTime}`;
      recordMap.set(key, record);
    });
    
    // 新记录覆盖同一时间段的旧记录
    let overwriteCount = 0;
    newRecords.forEach(record => {
      const key = `${record.date}_${record.startTime}_${record.endTime}`;
      if (recordMap.has(key)) {
        overwriteCount++;
      }
      recordMap.set(key, record);
    });
    
    // 转换回数组并按日期时间排序
    const mergedRecords = Array.from(recordMap.values()).sort((a, b) => {
      const aDateTime = `${a.date} ${a.startTime}`;
      const bDateTime = `${b.date} ${b.startTime}`;
      return aDateTime.localeCompare(bDateTime);
    });
    
    return { mergedRecords, overwriteCount };
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
          const { mergedRecords, overwriteCount } = mergeRecords(timeRecords, newRecords);
          setTimeRecords(mergedRecords);
          const message = overwriteCount > 0 
            ? `导入成功，共 ${newRecords.length} 条数据，覆盖 ${overwriteCount} 条重复数据`
            : `导入成功，共 ${newRecords.length} 条数据`;
          showToastMessage(message);
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
        const { mergedRecords, overwriteCount } = mergeRecords(timeRecords, newRecords);
        setTimeRecords(mergedRecords);
        const message = overwriteCount > 0 
          ? `导入成功，共 ${newRecords.length} 条数据，覆盖 ${overwriteCount} 条重复数据`
          : `导入成功，共 ${newRecords.length} 条数据`;
        showToastMessage(message);
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
    setEditName(record.name);
    setEditDate(record.date);
    setEditStartTime(record.startTime);
    setEditEndTime(record.endTime);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (editingRecord) {
      setTimeRecords(timeRecords.map(r => 
        r.id === editingRecord.id 
          ? { ...r, name: editName, date: editDate, startTime: editStartTime, endTime: editEndTime, source: 'manual' as const }
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
      source: 'manual',
      createdAt: Date.now()
    };
    
    // 添加新记录并按日期和时间排序
    const updatedRecords = [...timeRecords, newRecord].sort((a, b) => {
      const aDateTime = `${a.date} ${a.startTime}`;
      const bDateTime = `${b.date} ${b.startTime}`;
      return aDateTime.localeCompare(bDateTime);
    });
    
    setTimeRecords(updatedRecords);
    setIsAddingRecord(false);
    setNewRecordName('');
    setNewRecordDate('');
    setNewRecordStartTime('');
    setNewRecordEndTime('');
    showToastMessage('添加成功');
  };

  // 开始新增记录
  const startAddRecord = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setNewRecordDate(todayStr);
    setNewRecordStartTime(currentTime);
    setNewRecordEndTime(currentTime);
    setIsAddingRecord(true);
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ backgroundColor: '#FFFAF0' }}>
      {/* 背景装饰 */}
      <div className="absolute -right-10 top-10 w-40 h-40 rounded-full blur-2xl opacity-50" style={{ backgroundColor: '#FFECB3' }}></div>
      <div className="absolute -left-10 bottom-40 w-32 h-32 rounded-full blur-xl opacity-40" style={{ backgroundColor: '#FFF8E1' }}></div>
      
      {/* 头部 */}
      <div className="px-6 pt-8 pb-4 z-10">
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 z-10">
        {/* 功能入口统一容器 */}
        <div className="bg-white rounded-[20px] overflow-hidden" style={{ boxShadow: '0 8px 24px rgba(255, 193, 7, 0.15)' }}>
          {/* AI计划番茄钟管理入口 */}
          <button 
            onClick={() => setShowPomodoroModal(true)}
            className="w-full p-5 flex items-center justify-between hover:bg-[#FFFAF0] focus:bg-transparent active:bg-[#FFFAF0] transition-all outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)' }}>
                <Timer size={24} style={{ color: '#FFA000' }} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold" style={{ color: '#5D4037' }}>AI计划番茄钟管理</h3>
                <p className="text-xs mt-1" style={{ color: '#A1887F' }}>
                  工作{pomodoroSettings.workDuration}分钟 · 休息{pomodoroSettings.breakDuration}分钟 · {pomodoroSettings.rounds}轮后长休息
                </p>
              </div>
            </div>
            <ChevronRight size={20} style={{ color: '#FFA000' }} />
          </button>

          {/* 分割线 */}
          <div className="h-px mx-5" style={{ backgroundColor: '#FFF8E1' }}></div>

          {/* 理想时间配比入口 */}
          <button 
            onClick={() => setShowIdealTimeModal(true)}
            className="w-full p-5 flex items-center justify-between hover:bg-[#FFFAF0] focus:bg-transparent active:bg-[#FFFAF0] transition-all outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)' }}>
                <PieChart size={24} style={{ color: '#FFA000' }} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold" style={{ color: '#5D4037' }}>理想时间配比</h3>
                <p className="text-xs mt-1" style={{ color: '#A1887F' }}>
                  已分配 {totalAllocatedTime}h / 24h
                </p>
              </div>
            </div>
            <ChevronRight size={20} style={{ color: '#FFA000' }} />
          </button>

          {/* 分割线 */}
          <div className="h-px mx-5" style={{ backgroundColor: '#FFF8E1' }}></div>

          {/* 数据管理 */}
          <button 
            onClick={() => setShowDataMenuModal(true)}
            className="w-full p-5 flex items-center justify-between hover:bg-[#FFFAF0] focus:bg-transparent active:bg-[#FFFAF0] transition-all outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)' }}>
                <Database size={24} style={{ color: '#FFA000' }} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold" style={{ color: '#5D4037' }}>数据管理</h3>
                <p className="text-xs mt-1" style={{ color: '#A1887F' }}>
                  共 {timeRecords.length} 条记录
                </p>
              </div>
            </div>
            <ChevronRight size={20} style={{ color: '#FFA000' }} />
          </button>

          {/* 分割线 */}
          <div className="h-px mx-5" style={{ backgroundColor: '#FFF8E1' }}></div>

          {/* 获取最新版本 - 用于主屏幕 Web App 模式 */}
          <button 
            onClick={() => window.location.reload()}
            className="w-full p-5 flex items-center justify-between hover:bg-[#FFFAF0] focus:bg-transparent active:bg-[#FFFAF0] transition-all outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)' }}>
                <RefreshCw size={24} style={{ color: '#FFA000' }} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold" style={{ color: '#5D4037' }}>获取最新版本</h3>
                <p className="text-xs mt-1" style={{ color: '#A1887F' }}>
                  重新加载应用获取最新内容
                </p>
              </div>
            </div>
            <ChevronRight size={20} style={{ color: '#FFA000' }} />
          </button>

          {/* 分割线 */}
          <div className="h-px mx-5" style={{ backgroundColor: '#FFF8E1' }}></div>

          {/* 启用铃声 */}
          <button 
            onClick={async () => {
              const success = await alarmPlayer.unlock();
              if (success) {
                showToastMessage('🔔 铃声已启用！');
              } else {
                showToastMessage('启用失败，请重试');
              }
            }}
            className="w-full p-5 flex items-center justify-between hover:bg-[#FFFAF0] focus:bg-transparent active:bg-[#FFFAF0] transition-all outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFE0E6 0%, #FFCDD2 100%)' }}>
                <span className="text-2xl">🔔</span>
              </div>
              <div className="text-left">
                <h3 className="font-semibold" style={{ color: '#5D4037' }}>启用铃声</h3>
                <p className="text-xs mt-1" style={{ color: '#A1887F' }}>
                  点击启用计时器提醒铃声（手机必点）
                </p>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: alarmPlayer.isUnlocked() ? '#E8F5E9' : '#FFF3E0', color: alarmPlayer.isUnlocked() ? '#4CAF50' : '#FF9800' }}>
              {alarmPlayer.isUnlocked() ? '已启用' : '未启用'}
            </div>
          </button>
        </div>
      </div>

      {/* 数据管理菜单弹窗 */}
      {showDataMenuModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white w-[85%] rounded-[2rem] p-5 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-[#2D2D2D]">数据管理</h3>
              <button 
                onClick={() => setShowDataMenuModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => {
                  setShowDataMenuModal(false);
                  setShowDataManageModal(true);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-yellow-50 hover:bg-yellow-100 transition-all border-2 border-yellow-100"
              >
                <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
                  <Database size={20} className="text-white" />
                </div>
                <div className="text-left flex-1">
                  <span className="text-sm font-bold text-gray-700">查看数据源</span>
                  <p className="text-xs text-gray-400 mt-0.5">查看和编辑时间记录</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
              
              <button 
                onClick={() => {
                  setShowDataMenuModal(false);
                  setShowCategoryAssignModal(true);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-purple-50 hover:bg-purple-100 transition-all border-2 border-purple-100"
              >
                <div className="w-10 h-10 bg-purple-400 rounded-xl flex items-center justify-center">
                  <ListTodo size={20} className="text-white" />
                </div>
                <div className="text-left flex-1">
                  <span className="text-sm font-bold text-gray-700">分类归属</span>
                  <p className="text-xs text-gray-400 mt-0.5">管理事件分类</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
              
              <button 
                onClick={() => {
                  setShowDataMenuModal(false);
                  exportData();
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-green-50 hover:bg-green-100 transition-all border-2 border-green-100"
              >
                <div className="w-10 h-10 bg-green-400 rounded-xl flex items-center justify-center">
                  <Download size={20} className="text-white" />
                </div>
                <div className="text-left flex-1">
                  <span className="text-sm font-bold text-gray-700">导出数据</span>
                  <p className="text-xs text-gray-400 mt-0.5">导出时间记录为文件</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
              
              <button 
                onClick={() => {
                  setShowDataMenuModal(false);
                  setShowImportModal(true);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-all border-2 border-blue-100"
              >
                <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center">
                  <Upload size={20} className="text-white" />
                </div>
                <div className="text-left flex-1">
                  <span className="text-sm font-bold text-gray-700">导入数据</span>
                  <p className="text-xs text-gray-400 mt-0.5">从文件导入时间记录</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* 导入数据弹窗 */}
      {showImportModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white w-[90%] rounded-[2rem] p-6 shadow-2xl animate-scale-in max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-[#2D2D2D]">导入数据</h3>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                  setImportType(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* 选择导入类型 */}
            {!importType ? (
              <div className="space-y-3">
                <button
                  onClick={() => setImportType('calendar')}
                  className="w-full p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Calendar size={24} className="text-blue-500" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-700">导入时间记录</div>
                    <div className="text-xs text-gray-400">从 ICS 文件或文本导入</div>
                  </div>
                </button>
                <button
                  onClick={() => setImportType('journal')}
                  className="w-full p-4 rounded-2xl border-2 border-gray-100 hover:border-pink-200 hover:bg-pink-50 transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                    <BookHeart size={24} className="text-pink-500" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-700">导入日记</div>
                    <div className="text-xs text-gray-400">从 JSON 文件导入</div>
                  </div>
                </button>
              </div>
            ) : importType === 'calendar' ? (
              <>
                {/* 返回按钮 */}
                <div className="mb-4">
                  <button 
                    onClick={() => { setImportType(null); setImportText(''); }}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <ChevronLeft size={16} />
                    <span>返回选择</span>
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
                      setImportType(null);
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
              </>
            ) : (
              <>
                {/* 返回按钮 */}
                <div className="mb-4">
                  <button 
                    onClick={() => { setImportType(null); setImportText(''); }}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <ChevronLeft size={16} />
                    <span>返回选择</span>
                  </button>
                </div>

                {/* 上传 JSON 文件 */}
                <div className="mb-4">
                  <label className="text-sm font-bold text-gray-600 block mb-2">上传日记 JSON 文件</label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const content = event.target?.result as string;
                          const data = JSON.parse(content);
                          
                          // 验证数据格式
                          let journalsToImport: Journal[] = [];
                          
                          if (Array.isArray(data)) {
                            // 直接是日记数组
                            journalsToImport = data;
                          } else if (data.journals && Array.isArray(data.journals)) {
                            // 包含 journals 字段的对象
                            journalsToImport = data.journals;
                          } else {
                            showToastMessage('无效的日记数据格式');
                            return;
                          }
                          
                          // 验证每条日记的格式
                          const validJournals = journalsToImport.filter(j => 
                            j && typeof j.date === 'number' && typeof j.content === 'string'
                          ).map(j => ({
                            id: j.id || `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            date: j.date,
                            mood: j.mood || null,
                            content: j.content,
                            images: Array.isArray(j.images) ? j.images : []
                          }));
                          
                          if (validJournals.length === 0) {
                            showToastMessage('未找到有效的日记数据');
                            return;
                          }
                          
                          // 合并日记（按日期去重，保留新导入的）
                          const existingDates = new Set(journals.map(j => new Date(j.date).toDateString()));
                          const newJournals = validJournals.filter(j => !existingDates.has(new Date(j.date).toDateString()));
                          const updatedJournals = validJournals.filter(j => existingDates.has(new Date(j.date).toDateString()));
                          
                          // 更新已存在的日记
                          let mergedJournals = journals.map(existing => {
                            const updated = updatedJournals.find(j => new Date(j.date).toDateString() === new Date(existing.date).toDateString());
                            return updated || existing;
                          });
                          
                          // 添加新日记
                          mergedJournals = [...mergedJournals, ...newJournals];
                          
                          setJournals(mergedJournals);
                          
                          const message = updatedJournals.length > 0 
                            ? `导入成功！新增 ${newJournals.length} 篇，更新 ${updatedJournals.length} 篇`
                            : `导入成功，共 ${newJournals.length} 篇日记`;
                          showToastMessage(message);
                          setShowImportModal(false);
                          setImportType(null);
                        } catch (err) {
                          console.error('解析日记文件失败:', err);
                          showToastMessage('文件解析失败，请确保是有效的 JSON 格式');
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="import-journal-file"
                  />
                  <label 
                    htmlFor="import-journal-file"
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:border-gray-400 hover:text-gray-600 cursor-pointer transition-all"
                  >
                    <Upload size={18} />
                    点击选择 JSON 文件
                  </label>
                </div>

                <p className="text-xs text-gray-400 mb-4">
                  支持导入之前导出的日记 JSON 文件。同一天的日记会被更新覆盖。
                </p>

                {/* 操作按钮 */}
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowImportModal(false);
                      setImportText('');
                      setImportType(null);
                    }}
                    className="flex-1"
                  >
                    取消
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 数据管理弹窗 */}
      {showDataManageModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in">
          <div className="bg-white w-[95%] max-w-[430px] rounded-[2rem] p-5 shadow-2xl animate-scale-in max-h-[85%] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-[#2D2D2D]">查看数据源</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={startAddRecord}
                  className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 hover:bg-green-200"
                  title="添加记录"
                >
                  <Plus size={18} />
                </button>
                <button 
                  onClick={() => {
                    setShowDataManageModal(false);
                    setEditingRecord(null);
                    setIsAddingRecord(false);
                    setDataSearchQuery('');
                    setHasInitialScrolled(false);
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* 搜索框 */}
            <div className="mb-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={dataSearchQuery}
                  onChange={(e) => setDataSearchQuery(e.target.value)}
                  placeholder="搜索事项名称..."
                  className="w-full bg-gray-50 rounded-xl pl-9 pr-4 py-2.5 text-sm border border-gray-200 outline-none focus:border-blue-300 focus:bg-white"
                />
                {dataSearchQuery && (
                  <button
                    onClick={() => setDataSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
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
                  // 只在首次打开弹窗时定位，之后不再自动定位
                  if (el && timeRecords.length > 0 && !hasInitialScrolled && !dataSearchQuery) {
                    setHasInitialScrolled(true);
                    
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
                  // 根据搜索词过滤记录
                  const filteredRecords = dataSearchQuery 
                    ? timeRecords.filter(r => r.name.toLowerCase().includes(dataSearchQuery.toLowerCase()))
                    : timeRecords;
                  
                  if (filteredRecords.length === 0 && dataSearchQuery) {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center py-10">
                        <Search size={48} className="text-gray-300 mb-4" />
                        <p className="text-gray-400 text-sm">未找到匹配的记录</p>
                        <p className="text-gray-300 text-xs mt-1">尝试其他关键词</p>
                      </div>
                    );
                  }
                  
                  // 按日期分组
                  const sortedRecords = [...filteredRecords].sort((a, b) => {
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
                      
                      {/* 该日期下的记录和空白时间段（按时间排序） */}
                      <div className="space-y-2">
                        {(() => {
                          // 时间转分钟
                          const timeToMinutes = (time: string) => {
                            const [h, m] = time.split(':').map(Number);
                            return h * 60 + m;
                          };
                          
                          // 分钟转时间字符串
                          const minutesToTimeStr = (mins: number) => {
                            const h = Math.floor(mins / 60);
                            const m = mins % 60;
                            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                          };
                          
                          // 判断是否是今天
                          const today = new Date();
                          const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                          const isToday = date === todayStr;
                          const currentMinutes = isToday ? today.getHours() * 60 + today.getMinutes() : 24 * 60;
                          
                          // 获取当天记录并排序
                          const dayRecords = [...groupedByDate[date]].sort((a, b) => 
                            a.startTime.localeCompare(b.startTime)
                          );
                          
                          // 计算空白时间段
                          const gaps: { start: string; end: string; duration: number }[] = [];
                          
                          // 合并重叠的时间段，得到已覆盖的时间区间
                          const coveredIntervals: { start: number; end: number }[] = [];
                          dayRecords.forEach(record => {
                            const start = timeToMinutes(record.startTime);
                            const end = timeToMinutes(record.endTime);
                            
                            if (coveredIntervals.length === 0) {
                              coveredIntervals.push({ start, end });
                            } else {
                              const last = coveredIntervals[coveredIntervals.length - 1];
                              if (start <= last.end) {
                                last.end = Math.max(last.end, end);
                              } else {
                                coveredIntervals.push({ start, end });
                              }
                            }
                          });
                          
                          // 计算区间之间的空白
                          for (let i = 0; i < coveredIntervals.length - 1; i++) {
                            const gapStart = coveredIntervals[i].end;
                            const gapEnd = coveredIntervals[i + 1].start;
                            const effectiveGapEnd = isToday ? Math.min(gapEnd, currentMinutes) : gapEnd;
                            const gapMinutes = effectiveGapEnd - gapStart;
                            
                            if (gapMinutes >= 60) {
                              gaps.push({
                                start: minutesToTimeStr(gapStart),
                                end: minutesToTimeStr(effectiveGapEnd),
                                duration: gapMinutes
                              });
                            }
                          }
                          
                          // 检查最后一个区间到当前时间的空白（仅限今天）
                          if (isToday && coveredIntervals.length > 0) {
                            const lastEnd = coveredIntervals[coveredIntervals.length - 1].end;
                            const gapToNow = currentMinutes - lastEnd;
                            
                            if (gapToNow >= 60) {
                              gaps.push({
                                start: minutesToTimeStr(lastEnd),
                                end: minutesToTimeStr(currentMinutes),
                                duration: gapToNow
                              });
                            }
                          }
                          
                          // 合并记录和空白时间段，按开始时间排序
                          type DisplayItem = 
                            | { type: 'record'; data: TimeRecord }
                            | { type: 'gap'; data: { start: string; end: string; duration: number } };
                          
                          const allItems: DisplayItem[] = [
                            ...dayRecords.map(record => ({ type: 'record' as const, data: record })),
                            ...gaps.map(gap => ({ type: 'gap' as const, data: gap }))
                          ].sort((a, b) => {
                            const aStart = a.type === 'record' ? a.data.startTime : a.data.start;
                            const bStart = b.type === 'record' ? b.data.startTime : b.data.start;
                            return aStart.localeCompare(bStart);
                          });
                          
                          return allItems.map((item, idx) => {
                            if (item.type === 'gap') {
                              const gap = item.data;
                              return (
                                <div 
                                  key={`gap-${idx}`}
                                  onClick={() => {
                                    setNewRecordDate(date);
                                    setNewRecordStartTime(gap.start);
                                    setNewRecordEndTime(gap.end);
                                    setNewRecordName('');
                                    setIsAddingRecord(true);
                                  }}
                                  className="bg-orange-50 rounded-2xl p-4 border-2 border-dashed border-orange-200 cursor-pointer hover:bg-orange-100 transition-all"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-orange-400">⏰</span>
                                      <span className="text-sm text-orange-600 font-medium">
                                        空白时段 · {Math.floor(gap.duration / 60)}小时{gap.duration % 60 > 0 ? `${gap.duration % 60}分钟` : ''}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-orange-400">{gap.start} - {gap.end}</span>
                                      <Plus size={16} className="text-orange-400" />
                                    </div>
                                  </div>
                                  <div className="text-xs text-orange-400 mt-1">点击补充这段时间在做什么</div>
                                </div>
                              );
                            } else {
                              const record = item.data;
                              return (
                                <div key={record.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                  {editingRecord?.id === record.id ? (
                                    // 编辑模式
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <label className="text-xs text-gray-500 w-12">名称</label>
                                        <input
                                          type="text"
                                          value={editName}
                                          onChange={(e) => setEditName(e.target.value)}
                                          className="flex-1 bg-white rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-blue-300 font-bold text-gray-700"
                                        />
                                      </div>
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
                                              : record.source === 'manual'
                                              ? 'bg-green-100 text-green-600'
                                              : 'bg-blue-100 text-blue-600'
                                          }`}>
                                            {record.source === 'timer' ? '计时器' : record.source === 'manual' ? '手动' : '导入'}
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
                              );
                            }
                          });
                        })()}
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
              // 移除emoji的辅助函数
              const removeEmoji = (str: string) => {
                return str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu, '').trim();
              };

              // 按名称去重获取唯一事件（移除emoji后比较）
              const eventMap = new Map<string, any>();
              [...timeRecords, ...globalTimers.map(t => ({ 
                id: t.id, 
                name: t.name, 
                categoryId: t.categoryId 
              }))].forEach(item => {
                const normalizedName = removeEmoji(item.name);
                // 如果已存在，保留有分类的那个；如果都有或都没有分类，保留后来的
                const existing = eventMap.get(normalizedName);
                if (!existing || (item.categoryId && item.categoryId !== 'uncategorized')) {
                  eventMap.set(normalizedName, { ...item, normalizedName });
                }
              });

              const uniqueEvents = Array.from(eventMap.values()).sort((a: any, b: any) => {
                // 待分类的排在前面
                const aUncategorized = !a.categoryId || a.categoryId === 'uncategorized';
                const bUncategorized = !b.categoryId || b.categoryId === 'uncategorized';
                if (aUncategorized && !bUncategorized) return -1;
                if (!aUncategorized && bUncategorized) return 1;
                return a.normalizedName.localeCompare(b.normalizedName);
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
                    const currentCategory = event.categoryId || 'uncategorized';
                    const currentCatInfo = currentCategory === 'uncategorized' 
                      ? { icon: '📁', label: '待分类', color: '#9ca3af' }
                      : timeCategories.find(c => c.id === currentCategory) || { icon: '📁', label: '待分类', color: '#9ca3af' };
                    
                    return (
                      <div key={event.normalizedName} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-gray-700">{event.normalizedName}</span>
                          <span className="text-xs text-gray-400">
                            当前：{currentCatInfo.icon} {currentCatInfo.label}
                          </span>
                        </div>
                        
                        {/* 分类选择按钮列表 */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {timeCategories.map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => {
                                const newCategoryId = cat.id as CategoryId;
                                const normalizedName = event.normalizedName;
                                
                                setTimeRecords(timeRecords.map(r => 
                                  removeEmoji(r.name) === normalizedName ? { ...r, categoryId: newCategoryId } : r
                                ));
                                
                                setGlobalTimers(prev => prev.map(t => 
                                  removeEmoji(t.name) === normalizedName ? { ...t, categoryId: newCategoryId } : t
                                ));
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                currentCategory === cat.id
                                  ? 'ring-2'
                                  : 'hover:opacity-80'
                              }`}
                              style={{ 
                                backgroundColor: currentCategory === cat.id ? cat.color + '30' : cat.color + '15',
                                color: cat.color,
                                boxShadow: currentCategory === cat.id ? `0 0 0 2px ${cat.color}` : 'none'
                              }}
                            >
                              {cat.icon} {cat.label}
                            </button>
                          ))}
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
                    <div className="text-xs text-gray-400">DOC 格式（阅读用）或 JSON 格式（备份用）</div>
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

                {exportType === 'journal' ? (
                  <div className="flex gap-3 mt-4">
                    <Button 
                      onClick={exportJournalAsDoc}
                      className="flex-1"
                      style={{ backgroundColor: '#CFA0E9' }}
                    >
                      <Download size={18} />
                      DOC 格式
                    </Button>
                    <Button 
                      onClick={exportJournalAsJson}
                      className="flex-1"
                      style={{ backgroundColor: '#60a5fa' }}
                    >
                      <Download size={18} />
                      JSON 备份
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={exportCalendarAsIcs}
                    className="mt-4"
                    style={{ backgroundColor: '#60a5fa' }}
                  >
                    <Download size={18} />
                    确认导出
                  </Button>
                )}
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
            <div 
              className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
              style={{ 
                background: 'linear-gradient(135deg, #FFF176 0%, #FFD54F 100%)',
                boxShadow: '0 6px 20px rgba(255, 214, 0, 0.25)'
              }}
            >
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowIdealTimeModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/30"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)' }}
                >
                  <ChevronLeft size={20} />
                </button>
                <h3 
                  className="text-lg font-black text-white"
                  style={{ textShadow: '0 1px 2px rgba(230, 160, 0, 0.2)' }}
                >
                  理想时间配比
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className={`px-4 py-2 rounded-full font-black text-sm text-white`}
                  style={{ 
                    backgroundColor: totalAllocatedTime === 24 
                      ? 'rgba(74, 222, 128, 0.8)' 
                      : totalAllocatedTime > 24 
                        ? 'rgba(248, 113, 113, 0.8)' 
                        : 'rgba(255, 255, 255, 0.25)',
                    backdropFilter: 'blur(4px)'
                  }}
                >
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
                  className="flex-1 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                  style={{ 
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #FFF59D',
                    color: '#FBC02D'
                  }}
                >
                  重置默认
                </button>
                <button
                  onClick={() => {
                    setShowIdealTimeModal(false);
                    showToastMessage('时间配比已保存');
                  }}
                  className="flex-1 py-3 rounded-2xl text-white font-bold hover:opacity-90 transition-all"
                  style={{ 
                    background: 'linear-gradient(135deg, #FFF176 0%, #FFD54F 100%)',
                    boxShadow: '0 6px 20px rgba(255, 214, 0, 0.25)',
                    textShadow: '0 1px 2px rgba(230, 160, 0, 0.2)'
                  }}
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
  // 从 localStorage 恢复上次的页面，默认为 timer
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const saved = localStorage.getItem('activeTab');
    return (saved as TabId) || 'timer';
  });
  // 原始值: true (需要恢复时改回来)
  const [isFirstTime, setIsFirstTime] = useState(false); // 模拟首次使用
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('work'); // 添加全局分类状态
  
  // 持久化 activeTab 到 localStorage
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);
  
  // 铃声提示弹窗状态
  const [showSoundTip, setShowSoundTip] = useState(() => {
    // 检查是否已经显示过提示
    const hasShown = localStorage.getItem('soundTipShown');
    return !hasShown;
  });
  
  // 全局分类数据 - 持久化到localStorage
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('categories');
    return saved ? JSON.parse(saved) : [
      { id: 'work', label: '工作' },
      { id: 'study', label: '学习' },
      { id: 'sleep', label: '睡眠' },
      { id: 'life', label: '生活' },
      { id: 'rest', label: '休息' },
      { id: 'entertainment', label: '娱乐' },
      { id: 'health', label: '健康' },
      { id: 'hobby', label: '兴趣' },
    ];
  });
  
  // 全局番茄钟设置 - 持久化到localStorage
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>(() => {
    const saved = localStorage.getItem('pomodoroSettings');
    return saved ? JSON.parse(saved) : {
      workDuration: 25,
      breakDuration: 5,
      rounds: 4,
      longBreakDuration: 15
    };
  });

  // 持久化pomodoroSettings到localStorage
  useEffect(() => {
    localStorage.setItem('pomodoroSettings', JSON.stringify(pomodoroSettings));
  }, [pomodoroSettings]);

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

  // 持久化categories到localStorage
  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  // 持久化timeRecords到localStorage
  useEffect(() => {
    localStorage.setItem('timeRecords', JSON.stringify(timeRecords));
  }, [timeRecords]);

  // 持久化globalTimers到localStorage
  useEffect(() => {
    localStorage.setItem('globalTimers', JSON.stringify(globalTimers));
  }, [globalTimers]);

  // 全局日记数据 - 持久化到localStorage
  const [journals, setJournals] = useState<Journal[]>(() => {
    const saved = localStorage.getItem('journals');
    return saved ? JSON.parse(saved) : [];
  });

  // 持久化journals到localStorage
  useEffect(() => {
    localStorage.setItem('journals', JSON.stringify(journals));
  }, [journals]);

  // PlanView 持久化状态 - 切换tab时保留，并持久化到localStorage
  const [planStep, setPlanStep] = useState<'setup' | 'generating' | 'schedule'>(() => {
    const saved = localStorage.getItem('planStep');
    // 如果之前是generating状态，恢复为setup（因为生成过程不能恢复）
    if (saved === 'generating') return 'setup';
    return (saved as 'setup' | 'schedule') || 'setup';
  });
  const [planScheduleData, setPlanScheduleData] = useState<any>(() => {
    const saved = localStorage.getItem('planScheduleData');
    if (saved) {
      const data = JSON.parse(saved);
      // 检查数据是否是今天生成的，如果不是则清除
      if (data && data.schedule && data.schedule.length > 0) {
        const firstItemDate = new Date(data.schedule[0].start);
        const today = new Date();
        if (firstItemDate.toDateString() !== today.toDateString()) {
          // 数据不是今天的，清除
          localStorage.removeItem('planScheduleData');
          localStorage.setItem('planStep', 'setup');
          return null;
        }
      }
      return data;
    }
    return null;
  });
  const [planTasks, setPlanTasks] = useState<Array<{id: string, name: string, duration: number, categoryId?: CategoryId}>>(() => {
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
  const [planMentalStatus, setPlanMentalStatus] = useState<'energetic' | 'normal' | 'tired' | 'anxious' | 'nervous' | 'sad' | 'angry' | 'addicted'>('normal');
  const [planBodyStatus, setPlanBodyStatus] = useState<'good' | 'backPain' | 'headache' | 'periodPain' | 'wristPain'>('good');
  const [planNewTaskName, setPlanNewTaskName] = useState('');
  const [planNewTaskDuration, setPlanNewTaskDuration] = useState(60);

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

  // 全局计时器完成检测 - 在任何页面都能播放铃声
  useEffect(() => {
    const checkTimerCompletion = () => {
      const persistentState = localStorage.getItem('persistentTimerState');
      if (!persistentState) return;
      
      try {
        const state = JSON.parse(persistentState);
        
        // 检查专注页面计时器
        if (state.focusTimer && state.focusTimer.status === 'running' && state.focusTimer.startTimestamp) {
          const { startTimestamp, totalDuration, timerMode, pomodoroConfig, pomodoroPhase } = state.focusTimer;
          
          if (timerMode === 'countdown') {
            const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
            const remaining = totalDuration - elapsed;
            if (remaining <= 0 && remaining > -2) {
              alarmPlayer.play(10000);
            }
          } else if (timerMode === 'pomodoro' && pomodoroConfig) {
            const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
            const phaseDuration = pomodoroPhase === 'work' 
              ? pomodoroConfig.workDuration * 60 
              : pomodoroPhase === 'break' 
              ? pomodoroConfig.breakDuration * 60 
              : pomodoroConfig.longBreakDuration * 60;
            const remaining = phaseDuration - elapsed;
            if (remaining <= 0 && remaining > -2) {
              alarmPlayer.play(10000);
            }
          }
        }
        
        // 检查规划页面计时器
        if (state.planTimer && state.planTimer.status === 'running' && state.planTimer.startTimestamp) {
          const { startTimestamp, totalDuration, timerMode, pomodoroConfig, pomodoroPhase } = state.planTimer;
          
          if (timerMode === 'countdown') {
            const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
            const remaining = totalDuration - elapsed;
            if (remaining <= 0 && remaining > -2) {
              alarmPlayer.play(10000);
            }
          } else if (timerMode === 'pomodoro' && pomodoroConfig) {
            const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
            const phaseDuration = pomodoroPhase === 'work' 
              ? pomodoroConfig.workDuration * 60 
              : pomodoroPhase === 'break' 
              ? pomodoroConfig.breakDuration * 60 
              : pomodoroConfig.longBreakDuration * 60;
            const remaining = phaseDuration - elapsed;
            if (remaining <= 0 && remaining > -2) {
              alarmPlayer.play(10000);
            }
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    };
    
    // 每秒检查一次
    const interval = setInterval(checkTimerCompletion, 1000);
    return () => clearInterval(interval);
  }, []);

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
      case 'timer': return <TimerView selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} timeRecords={timeRecords} setTimeRecords={setTimeRecords} globalTimers={globalTimers} setGlobalTimers={setGlobalTimers} categories={categories} setCategories={setCategories} />;
      case 'journal': return <JournalView journals={journals} setJournals={setJournals} />;
      case 'review': return <ReviewView journals={journals} timeRecords={timeRecords} setTimeRecords={setTimeRecords} globalTimers={globalTimers} setGlobalTimers={setGlobalTimers} idealTimeAllocation={idealTimeAllocation} />;
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
      case 'settings': return <SettingsView pomodoroSettings={pomodoroSettings} setPomodoroSettings={setPomodoroSettings} timeRecords={timeRecords} setTimeRecords={setTimeRecords} journals={journals} setJournals={setJournals} idealTimeAllocation={idealTimeAllocation} setIdealTimeAllocation={setIdealTimeAllocation} globalTimers={globalTimers} setGlobalTimers={setGlobalTimers} />;
      default: return <TimerView selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} timeRecords={timeRecords} setTimeRecords={setTimeRecords} globalTimers={globalTimers} setGlobalTimers={setGlobalTimers} categories={categories} setCategories={setCategories} />;
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

  // 将hex颜色转换为带透明度的rgba
  const hexToRgbaApp = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // 动态渐变背景
  const getTimerGradient = () => {
    // 获取当前选中分类的完整对象，检查是否有自定义颜色
    const currentCat = categories.find(c => c.id === selectedCategory);
    const hasCustomColor = currentCat?.color !== undefined && currentCat?.color !== null && currentCat?.color !== '';
    
    // 如果有自定义颜色，使用自定义颜色生成浅色背景；否则使用预定义浅色
    const categoryLight = hasCustomColor 
      ? hexToRgbaApp(currentCat!.color!, 0.08) 
      : (MACARON_COLORS.categories[selectedCategory]?.light || '#faf5ff');
    
    return `linear-gradient(to bottom, ${categoryLight}, #ffffff)`;
  };
  
  const gradientMap: Record<string, string> = {
    plan: 'linear-gradient(to bottom, #E8F5E9, #E8F5E9)',
    timer: getTimerGradient(),
    journal: '#F9F6FD',
    review: 'linear-gradient(to bottom, #f0f9ff, #ffffff)',
    settings: 'linear-gradient(to bottom, #fefce8, #ffffff)',
  };
  const currentGradient = gradientMap[activeTab] || gradientMap.plan;

  return (
    <>
      {/* 独立的超大背景层 - 120vh高度往上溢出覆盖刘海 */}
      <div 
        className="fixed left-0 w-full -z-10"
        style={{ 
          background: currentGradient, 
          height: '120vh',
          top: '-10vh',
          backgroundAttachment: 'fixed',
          transition: 'background 0.5s ease'
        }} 
      />
      
      {/* 内容层 - 背景透明 */}
      <div className="iphone-container relative bg-transparent mx-auto h-full flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* 主内容区域 - flex-1 占满剩余空间，overflow-y-auto 允许滚动 */}
      <div className="flex-1 overflow-y-auto pb-24">
        {renderView()}
      </div>
      
      {/* 底部导航栏 - 直接矩形，无圆角 */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-24 bg-white !border-0 !ring-0 !shadow-none !outline-none z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', border: 'none', boxShadow: 'none', outline: 'none' }}
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
                    className={`p-3 rounded-2xl transition-all duration-500 !border-0 !ring-0 !shadow-none !outline-none ${
                      isActive 
                        ? 'bg-white -translate-y-3 scale-110' 
                        : 'hover:bg-white/40'
                    }`}
                    style={{ boxShadow: 'none', border: 'none', outline: 'none' }}
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

        {/* 铃声启用提示弹窗 */}
        {showSoundTip && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4"
            onClick={() => {
              setShowSoundTip(false);
              localStorage.setItem('soundTipShown', 'true');
            }}
          >
            <div 
              className="bg-white rounded-3xl p-6 w-full max-w-sm animate-scale-in"
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className="text-5xl mb-3">🔔</div>
                <h3 className="text-xl font-black text-[#2D3436] mb-2">启用铃声提醒</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  为了在计时结束时提醒你，请点击下方按钮启用铃声。
                  <br />
                  <span className="text-pink-500 font-bold">手机用户必须点击！</span>
                </p>
              </div>
              
              <button
                onClick={async () => {
                  await alarmPlayer.unlock();
                  setShowSoundTip(false);
                  localStorage.setItem('soundTipShown', 'true');
                }}
                className="w-full py-4 rounded-2xl text-white font-bold text-base hover:opacity-90 transition-all mb-3"
                style={{ backgroundColor: '#FF6B6B' }}
              >
                🔊 启用铃声
              </button>
              
              <button
                onClick={() => {
                  setShowSoundTip(false);
                  localStorage.setItem('soundTipShown', 'true');
                }}
                className="w-full py-3 text-gray-400 font-medium text-sm"
              >
                稍后再说
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}