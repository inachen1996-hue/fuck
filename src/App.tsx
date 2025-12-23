import { useState, useEffect, useRef } from 'react';
import { 
  Timer, BookHeart, PieChart, Calendar, Settings2, 
  Plus, Heart, Play, Clock, Smartphone, ChevronRight,
  ArrowRight, Sparkles, Target, Coffee, Zap,
  Edit3, Save, X, Camera, ChevronLeft,
  Award, CheckCircle, RefreshCw, Brain, Lightbulb,
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
    review: '#7dd3fc',   // 海盐蓝
    plan: '#5eead4',     // 薄荷绿
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
    plan: 'from-teal-50 via-white to-orange-50',
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
  setSelectedCategory: propSetSelectedCategory 
}: {
  selectedCategory?: CategoryId;
  setSelectedCategory?: (category: CategoryId) => void;
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
  const [timers, setTimers] = useState<Timer[]>([]);
  const [activeTimer, setActiveTimer] = useState<Timer | null>(null);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showManageCategoryModal, setShowManageCategoryModal] = useState(false);
  const [showNewTimerModal, setShowNewTimerModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#FF8CA1');
  const [newTimerName, setNewTimerName] = useState('');
  const [newTimerDuration, setNewTimerDuration] = useState(25);
  
  // 分类列表滚动容器 ref
  const categoryListRef = useRef<HTMLDivElement>(null);

  // 计时器逻辑
  useEffect(() => {
    let interval: number;
    
    if (activeTimer && activeTimer.status === 'running') {
      interval = window.setInterval(() => {
        setActiveTimer(prev => {
          if (!prev || prev.remainingTime <= 0) {
            // 计时器完成
            setTimers(timers => timers.map(t => 
              t.id === prev?.id ? { ...t, status: 'completed' as TimerStatus, remainingTime: 0 } : t
            ));
            return prev ? { ...prev, status: 'completed', remainingTime: 0 } : null;
          }
          
          const updated = { ...prev, remainingTime: prev.remainingTime - 1 };
          // 同步更新timers数组
          setTimers(timers => timers.map(t => 
            t.id === prev.id ? updated : t
          ));
          return updated;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
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
        categoryId: selectedCategory,
        duration: newTimerDuration,
        remainingTime: newTimerDuration * 60,
        status: 'idle',
        createdAt: Date.now()
      };
      setTimers([...timers, timer]);
      setNewTimerName('');
      setNewTimerDuration(25);
      setShowNewTimerModal(false);
    }
  };

  const startTimer = (timer: Timer) => {
    // 暂停其他正在运行的计时器
    setTimers(prev => prev.map(t => 
      t.status === 'running' ? { ...t, status: 'paused' } : t
    ));
    
    const updatedTimer = { ...timer, status: 'running' as TimerStatus };
    setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
    setActiveTimer(updatedTimer);
  };

  const pauseTimer = (timer: Timer) => {
    const updatedTimer = { ...timer, status: 'paused' as TimerStatus };
    setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
    setActiveTimer(updatedTimer);
  };

  const resetTimer = (timer: Timer) => {
    const updatedTimer = { 
      ...timer, 
      status: 'idle' as TimerStatus, 
      remainingTime: timer.duration * 60 
    };
    setTimers(prev => prev.map(t => t.id === timer.id ? updatedTimer : t));
    if (activeTimer?.id === timer.id) {
      setActiveTimer(updatedTimer);
    }
  };

  const deleteTimer = (timerId: string) => {
    setTimers(prev => prev.filter(t => t.id !== timerId));
    if (activeTimer?.id === timerId) {
      setActiveTimer(null);
    }
  };

  const categoryTimers = timers.filter(t => t.categoryId === selectedCategory);

  return (
    <div className="flex h-full relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute bottom-10 left-10 w-24 h-24 rounded-full bg-cyan-100 blur-xl opacity-40 animate-pulse"></div>
      <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-purple-100 blur-xl opacity-50"></div>
      
      {/* 侧边栏 */}
      <div className="w-[70px] h-full flex flex-col items-center py-6 border-r border-white/40 bg-white/20 backdrop-blur-sm z-10">
        {/* 管理分类按钮 - 置顶 */}
        <button 
          onClick={() => setShowManageCategoryModal(true)}
          className="w-[calc(100%-8px)] mx-1 py-2 mb-3 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-white/80 hover:scale-105 border-2 border-dashed border-gray-300"
        >
          <Settings2 size={14} className="text-gray-400 mb-1" />
          <span className="text-[8px] font-black text-gray-400">管理</span>
        </button>
        
        <div className="space-y-2 w-full flex flex-col items-center px-1 flex-1 overflow-y-auto">
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
      <div className="flex-1 flex flex-col h-full relative overflow-hidden z-10">
        <div className="px-6 pt-8 pb-3 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-black text-[#2D2D2D] tracking-tight">
                {selectedCategory === 'uncategorized' ? '待分类' : categories.find(c => c.id === selectedCategory)?.label}
              </h2>
              <div className="w-2 h-2 rounded-full bg-cyan-200 ring-2 ring-purple-200"></div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: theme.primary }}>
              FOCUS MODE
            </p>
          </div>
          <button 
            onClick={() => setShowNewTimerModal(true)}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl hover:brightness-110 active:scale-90 transition-all border-b-4"
            style={{ backgroundColor: theme.primary, boxShadow: `0 10px 20px -5px ${theme.primary}66`, borderBottomColor: theme.primary + '80' }}
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {categoryTimers.length === 0 ? (
            // 空状态
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center opacity-60">
                <div className="w-24 h-24 rounded-[2rem] mb-4 flex items-center justify-center" style={{ backgroundColor: theme.light }}>
                  <Timer size={40} style={{ color: theme.primary }} />
                </div>
                <p className="text-[#2D2D2D] font-bold text-lg">创建专注计时器</p>
                <p className="text-[#8A8A8A] text-sm mt-2 px-4">点击右上角 + 号开始创建你的第一个计时器</p>
              </div>
            </div>
          ) : (
            // 计时器列表
            <div className="space-y-4">
              {categoryTimers.map(timer => (
                <div 
                  key={timer.id}
                  className={`relative w-full rounded-[2rem] p-6 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] bg-white/90 backdrop-blur-xl border-2 border-white transition-all duration-500 ${
                    activeTimer?.id === timer.id ? 'scale-105 ring-4 ring-purple-50' : 'hover:-translate-y-1'
                  }`}
                  style={{ 
                    borderColor: timer.status === 'running' ? theme.primary : 
                                timer.status === 'completed' ? '#42D4A4' : 'white'
                  }}
                >
                  <div className="flex flex-col h-full justify-between items-center">
                    <div className="flex items-center gap-3 w-full">
                      <div 
                        className="w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <Clock size={26} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-black text-[#2D2D2D]">{timer.name}</h4>
                        <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mt-1">
                          {timer.status === 'idle' && 'READY'}
                          {timer.status === 'running' && 'FOCUSING'}
                          {timer.status === 'paused' && 'PAUSED'}
                          {timer.status === 'completed' && 'COMPLETED'}
                        </p>
                      </div>
                      <button 
                        onClick={() => deleteTimer(timer.id)}
                        className="text-gray-300 hover:text-red-400 hover:bg-red-50 p-2 rounded-full transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="text-center my-6">
                      <div className="text-5xl font-semibold font-mono text-[#2D2D2D] mb-3">
                        {formatTime(timer.remainingTime)}
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                        <div 
                          className="h-2 rounded-full transition-all duration-1000"
                          style={{ 
                            backgroundColor: timer.status === 'completed' ? '#42D4A4' : theme.primary,
                            width: `${((timer.duration * 60 - timer.remainingTime) / (timer.duration * 60)) * 100}%`
                          }}
                        />
                      </div>
                      <p className="text-[#2D2D2D] opacity-60 font-medium text-sm px-4">
                        {timer.status === 'completed' ? '恭喜完成专注时间！' : '全神贯注，此刻即是永恒。'}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      {timer.status === 'idle' || timer.status === 'paused' ? (
                        <button 
                          onClick={() => startTimer(timer)}
                          className="w-16 h-16 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg active:scale-90 transition-all hover:brightness-110 hover:scale-105 border-b-4"
                          style={{ backgroundColor: theme.primary, boxShadow: `0 10px 20px -5px ${theme.primary}66`, borderBottomColor: theme.primary + '80' }}
                        >
                          <Play fill="white" size={28} className="ml-1" />
                        </button>
                      ) : timer.status === 'running' ? (
                        <button 
                          onClick={() => pauseTimer(timer)}
                          className="w-16 h-16 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg active:scale-90 transition-all hover:brightness-110 hover:scale-105 border-b-4"
                          style={{ backgroundColor: theme.primary, boxShadow: `0 10px 20px -5px ${theme.primary}66`, borderBottomColor: theme.primary + '80' }}
                        >
                          <div className="flex gap-1">
                            <div className="w-2 h-6 bg-white rounded-sm"></div>
                            <div className="w-2 h-6 bg-white rounded-sm"></div>
                          </div>
                        </button>
                      ) : (
                        <button 
                          onClick={() => resetTimer(timer)}
                          className="w-16 h-16 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg active:scale-90 transition-all hover:brightness-110 hover:scale-105 border-b-4 border-emerald-500/30"
                          style={{ backgroundColor: '#42D4A4', boxShadow: '0 10px 20px -5px #42D4A466' }}
                        >
                          <RefreshCw size={24} />
                        </button>
                      )}
                      
                      {(timer.status === 'running' || timer.status === 'paused') && (
                        <button 
                          onClick={() => resetTimer(timer)}
                          className="w-12 h-12 rounded-[1rem] flex items-center justify-center text-gray-400 bg-gray-100 hover:bg-gray-200 active:scale-90 transition-all"
                        >
                          <RefreshCw size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
          <div className="bg-white w-[85%] rounded-3xl p-6 shadow-2xl animate-scale-in">
            <h3 className="text-xl font-black text-[#2D2D2D] mb-4 text-center">新增计时器</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-600 block mb-2">计时器名称</label>
                <input
                  type="text"
                  value={newTimerName}
                  onChange={(e) => setNewTimerName(e.target.value)}
                  placeholder="输入计时器名称..."
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-base outline-none focus:bg-white focus:ring-2 focus:ring-pink-200"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="text-sm font-bold text-gray-600 block mb-2">专注时长（分钟）</label>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setNewTimerDuration(Math.max(5, newTimerDuration - 5))}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                  >
                    -
                  </button>
                  <span className="text-2xl font-black text-[#2D2D2D] w-16 text-center">
                    {newTimerDuration}
                  </span>
                  <button 
                    onClick={() => setNewTimerDuration(Math.min(120, newTimerDuration + 5))}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500">分钟</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNewTimerModal(false);
                  setNewTimerName('');
                  setNewTimerDuration(25);
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
  const [previewImages, setPreviewImages] = useState<{ images: string[], index: number } | null>(null);

  const moods = [
    { id: 'happy', emoji: '😊', label: '开心', color: '#FFD23F' },
    { id: 'calm', emoji: '😌', label: '平静', color: '#42D4A4' },
    { id: 'sad', emoji: '😔', label: '难过', color: '#6CB6FF' },
    { id: 'excited', emoji: '🤩', label: '兴奋', color: '#FF9F1C' },
    { id: 'tired', emoji: '😴', label: '疲惫', color: '#E5E5E5' }
  ];

  const openEditor = (journal: Journal | null = null) => {
    if (journal) {
      setEditingJournalId(journal.id);
      setCurrentJournal({
        content: journal.content,
        mood: journal.mood,
        images: journal.images
      });
    } else {
      setEditingJournalId(null);
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
    
    if (editingJournalId) {
      // 编辑现有日记
      setJournals(journals.map(j => 
        j.id === editingJournalId 
          ? { ...j, mood: currentJournal.mood, content: currentJournal.content, images: currentJournal.images }
          : j
      ));
    } else {
      // 新增日记
      const newJournal = {
        id: Date.now().toString(),
        date: Date.now(),
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
      <div className="flex flex-col h-full relative overflow-hidden">
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
            <Save size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 z-10">
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
    <div className="flex flex-col h-full relative overflow-hidden">
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
          <Edit3 size={20} strokeWidth={3} />
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
  const [reportData, setReportData] = useState<any>(null);
  
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
    let startDate = new Date();
    
    switch (period) {
      case 'yesterday':
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const filteredRecords = timeRecords.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate >= startDate && recordDate <= now;
    });

    // 按分类统计时间（小时）
    const distribution: Record<string, number> = {};
    filteredRecords.forEach(record => {
      const start = record.startTime.split(':').map(Number);
      const end = record.endTime.split(':').map(Number);
      const hours = (end[0] * 60 + end[1] - start[0] * 60 - start[1]) / 60;
      
      const category = record.categoryId || 'uncategorized';
      distribution[category] = (distribution[category] || 0) + hours;
    });

    return distribution;
  };

  // 获取时间段内的日记
  const getJournalsInPeriod = (period: string) => {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'yesterday':
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    return journals.filter(j => {
      const journalDate = new Date(j.date);
      return journalDate >= startDate && journalDate <= now;
    });
  };

  // 生成AI复盘报告
  const generateReport = async () => {
    setIsGenerating(true);
    
    // 获取数据
    const actualDistribution = calculateActualTimeDistribution(aiPeriod);
    const periodJournals = getJournalsInPeriod(aiPeriod);
    const periodLabels: Record<string, string> = { yesterday: '昨日', today: '今日', week: '本周', month: '本月', history: '历史' };
    const periodDays: Record<string, number> = { yesterday: 1, today: 1, week: 7, month: 30, history: 365 };
    
    // 模拟AI分析过程
    setTimeout(() => {
      // 分析日记情绪
      const moodCounts: Record<string, number> = {};
      periodJournals.forEach(j => {
        if (j.mood) {
          moodCounts[j.mood] = (moodCounts[j.mood] || 0) + 1;
        }
      });
      const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'calm';
      
      // 计算理想与实际的差距
      const gaps: Array<{category: string, ideal: number, actual: number, diff: number}> = [];
      const days = periodDays[aiPeriod];
      
      timeCategories.forEach(cat => {
        const idealHours = (idealTimeAllocation[cat.id] || 0) * days;
        const actualHours = actualDistribution[cat.id] || 0;
        const diff = actualHours - idealHours;
        gaps.push({
          category: cat.label,
          ideal: idealHours,
          actual: actualHours,
          diff: diff
        });
      });

      // 找出最大的正负差距
      const overworked = gaps.filter(g => g.diff > 0).sort((a, b) => b.diff - a.diff);
      const underinvested = gaps.filter(g => g.diff < 0).sort((a, b) => a.diff - b.diff);

      // 计算总工作/学习时间占比
      const totalActualHours = Object.values(actualDistribution).reduce((sum, h) => sum + h, 0);
      const workStudyHours = (actualDistribution['work'] || 0) + (actualDistribution['study'] || 0);
      const workStudyRatio = totalActualHours > 0 ? (workStudyHours / totalActualHours * 100) : 0;
      
      // 深度分析指标
      const sleepHours = actualDistribution['sleep'] || 0;
      const restHours = actualDistribution['rest'] || 0;
      const healthHours = actualDistribution['health'] || 0;
      const entertainmentHours = actualDistribution['entertainment'] || 0;
      const lifeHours = actualDistribution['life'] || 0;
      const hobbyHours = actualDistribution['hobby'] || 0;
      
      const idealSleep = idealTimeAllocation['sleep'] * days;
      const idealRest = idealTimeAllocation['rest'] * days;
      const idealHealth = idealTimeAllocation['health'] * days;
      const sleepDebt = Math.max(0, idealSleep - sleepHours);
      
      const isSleepDeprived = sleepHours < idealSleep * 0.75;
      const isOverworking = workStudyRatio > 55 || (actualDistribution['work'] || 0) > idealTimeAllocation['work'] * days * 1.2;
      const isNeglectingHealth = healthHours < idealHealth * 0.3;
      const isNeglectingRest = restHours < idealRest * 0.5;
      const hasLifeBalance = (lifeHours + hobbyHours + entertainmentHours) >= (idealTimeAllocation['life'] + idealTimeAllocation['hobby'] + idealTimeAllocation['entertainment']) * days * 0.5;
      
      // 情绪深度分析
      const negativeMoods = (moodCounts['sad'] || 0) + (moodCounts['tired'] || 0);
      const positiveMoods = (moodCounts['happy'] || 0) + (moodCounts['excited'] || 0);
      const moodBalance = periodJournals.length > 0 ? (positiveMoods - negativeMoods) / periodJournals.length : 0;
      
      // 计算综合评分
      let score = 75;
      if (overworked.length <= 2 && underinvested.length <= 2) score += 8;
      if (!isSleepDeprived) score += 6;
      if (!isOverworking) score += 5;
      if (hasLifeBalance) score += 4;
      if (moodBalance > 0) score += 4;
      if (periodJournals.length >= days * 0.3) score += 3;
      if (isNeglectingHealth) score -= 8;
      if (isSleepDeprived) score -= 10;
      if (isOverworking) score -= 5;
      score = Math.min(100, Math.max(45, score));

      // 生成深度情绪分析
      const moodInsight = periodJournals.length === 0 
        ? '📝 这段时间没有日记记录。日记是了解内心的窗口，建议每天花几分钟记录感受，帮助您觉察情绪变化、及时调整状态。'
        : moodBalance > 0.3 
          ? `✨ 从日记来看，您的情绪整体 **积极向上**，${moodMap[dominantMood] || '开心'}的时刻占据主导。这种正向情绪是宝贵的内在资源，能增强您面对挑战的韧性。`
          : moodBalance < -0.3 
            ? `💭 日记显示近期 **${moodMap[dominantMood] || '疲惫'}** 的感受较多。这是身心在发出信号，提醒您需要关注自己。不必苛责，每个人都有低谷期，重要的是觉察并温柔对待自己。`
            : `🌿 您的情绪状态 **较为平稳**，这种稳定是一种力量。在平静中，您更容易做出理性决策，也更能感知生活中的细微美好。`;

      // 生成透支分析
      const burnoutIssues: string[] = [];
      if (isSleepDeprived) burnoutIssues.push(`睡眠仅为理想值的 **${((sleepHours / idealSleep) * 100).toFixed(0)}%**，累积约 **${sleepDebt.toFixed(1)}小时** 睡眠债务`);
      if (isOverworking) burnoutIssues.push(`工作学习占比 **${workStudyRatio.toFixed(0)}%**，超出健康阈值`);
      if (isNeglectingHealth) burnoutIssues.push(`健康运动严重不足，仅完成理想的 **${((healthHours / idealHealth) * 100).toFixed(0)}%**`);
      if (isNeglectingRest) burnoutIssues.push(`休息时间被压缩，大脑缺乏必要恢复期`);

      const burnoutAnalysis = burnoutIssues.length === 0 
        ? { level: 'good', title: '✅ 身心状态健康', content: '从数据看，您的时间分配较为合理，工作与休息保持良好平衡。这种状态下创造力和效率都能得到较好发挥。继续保持这种节奏，它是可持续发展的基础。' }
        : burnoutIssues.length <= 2 
          ? { level: 'warning', title: '⚠️ 轻度透支信号', content: `检测到：${burnoutIssues.join('；')}。\n\n这些信号提示您正在 **轻度透支**。短期可能感觉还好，但身体会默默记账。建议接下来一周有意识调整，避免累积成更大问题。` }
          : { level: 'danger', title: '🚨 需要立即关注', content: `多项指标显示 **明显透支**：${burnoutIssues.join('；')}。\n\n您的身心正在发出求救信号。这不是软弱，而是智慧的提醒。请认真对待，适当放慢脚步。**照顾好自己，才能更好地照顾其他事情**。` };

      // 生成报告
      const report = {
        period: periodLabels[aiPeriod],
        score: score,
        
        // 总结部分
        summary: {
          overview: `${periodLabels[aiPeriod]}共记录了 **${periodJournals.length}** 篇日记，时间记录 **${timeRecords.length}** 条。${totalActualHours > 0 ? `有效追踪时间 **${totalActualHours.toFixed(1)}小时**。` : ''}`,
          moodAnalysis: moodInsight,
          timeOverview: totalActualHours > 0 
            ? `时间分布上，工作学习占 **${workStudyRatio.toFixed(0)}%**，休息恢复占 **${(((sleepHours + restHours + healthHours) / totalActualHours) * 100).toFixed(0)}%**。${workStudyRatio > 55 ? '产出型活动占比较高，注意平衡。' : hasLifeBalance ? '整体分布较为均衡。' : '生活娱乐时间偏少，注意劳逸结合。'}`
            : '暂无足够时间记录数据。建议使用计时器记录日常活动，帮助您了解时间都去哪了。'
        },

        // 洞察部分
        insights: {
          burnoutRisk: burnoutAnalysis,

          // 与理想配比的差距
          gapAnalysis: {
            title: '📊 理想与现实的差距',
            overItems: overworked.slice(0, 2).map(g => ({
              category: g.category,
              message: `**${g.category}** 超出理想 ${Math.abs(g.diff).toFixed(1)}h`
            })),
            underItems: underinvested.slice(0, 2).map(g => ({
              category: g.category,
              message: `**${g.category}** 不足理想 ${Math.abs(g.diff).toFixed(1)}h`
            }))
          },

          // 坚持的益处/坏处 - 深度分析
          habits: {
            title: '🔍 行为模式洞察',
            positive: [
              periodJournals.length >= days * 0.5 ? '📝 **坚持记录日记** — 这个习惯正在帮助您建立自我觉察能力。研究表明，定期书写能减轻焦虑、提升情绪调节能力。' : null,
              healthHours >= idealHealth * 0.7 ? '🏃 **保持运动习惯** — 运动不仅强健体魄，还能促进多巴胺分泌，是天然的"快乐药"。您正在为未来储蓄健康。' : null,
              (actualDistribution['study'] || 0) >= idealTimeAllocation['study'] * days * 0.8 ? '📚 **持续学习成长** — 在快速变化的时代，学习能力就是核心竞争力。您的投入会产生复利效应。' : null,
              sleepHours >= idealSleep * 0.9 ? '😴 **重视睡眠质量** — 充足睡眠是高效工作的前提。您正在用科学方式管理精力。' : null,
              hasLifeBalance ? '🏠 **平衡生活与工作** — 您没有让工作吞噬生活，这种边界感是心理健康的重要保障。' : null,
            ].filter(Boolean),
            negative: [
              isSleepDeprived ? '😴 **睡眠债务累积** — 睡眠不足会导致：注意力下降、情绪波动、免疫力降低、长期记忆受损。这是在"透支未来"换取"现在的时间"，代价很高。' : null,
              isNeglectingHealth ? '🏃 **久坐少动** — 身体长期缺乏活动会导致代谢下降、肌肉流失、情绪低落。每天哪怕站起来走动10分钟，也是改变的开始。' : null,
              workStudyRatio > 65 ? '💼 **工作生活失衡** — 当工作占据生活大部分，其他维度就会萎缩。长此以往，可能感到空虚、倦怠，甚至影响人际关系。' : null,
              isNeglectingRest && isOverworking ? '⚡ **持续高压运转** — 没有休息的努力不可持续。大脑需要"空闲时间"来整合信息、产生创意。适当的"无所事事"其实是高效的一部分。' : null,
            ].filter(Boolean)
          }
        },

        // 建议部分
        advice: {
          // 三个月后的愿景 - 深度分析
          futureVision: {
            title: '🔮 三个月后的你',
            positive: !isOverworking && !isSleepDeprived 
              ? `🌟 **如果保持并优化当前的好习惯**：\n• 精力管理进入良性循环，工作效率稳步提升\n• 身心状态保持稳定，面对压力时更有韧性\n${healthHours > 0 ? '• 坚持运动让体能和精神状态更上一层楼\n' : ''}${hasLifeBalance ? '• 生活的丰富度带来更多幸福感和创造力' : ''}`
              : `🌟 **如果从现在开始调整**：\n• 睡眠质量改善，白天精力更充沛\n• 工作效率提升，用更少时间完成更多事\n• 情绪更稳定，人际关系更和谐`,
            warning: isSleepDeprived || isOverworking || isNeglectingHealth
              ? `💭 **如果不做调整**，可能会：\n${isSleepDeprived ? '• 睡眠债务逐渐显现：记忆力下降、反应变慢、情绪波动\n' : ''}${isOverworking ? '• 持续高强度工作导致职业倦怠，创造力和热情逐渐消退\n' : ''}${isNeglectingHealth ? '• 缺乏运动让身体机能下降，可能出现亚健康症状\n' : ''}${!hasLifeBalance ? '• 生活单一化带来空虚感，影响整体幸福度\n' : ''}\n但这不是要吓您——**意识到问题就是改变的开始**。从今天起，每天做一点小调整，三个月后会看到不同。`
              : `继续保持当前的平衡状态，您的生活质量会稳步提升。记住：**可持续的努力比短期冲刺更有价值**。`
          },

          // 最需要保护的三样事情 - 个性化
          protectList: {
            title: '🛡️ 当前最需要守护的三件事',
            items: [
              isSleepDeprived || sleepDebt > 2 
                ? { icon: '😴', name: '睡眠时间', reason: '这是您当前最需要补回的"债务"' }
                : { icon: '😴', name: '睡眠质量', reason: '好睡眠是一切精力的源泉' },
              moodBalance < 0 || negativeMoods > positiveMoods 
                ? { icon: '🧘', name: '情绪健康', reason: '给自己更多温柔和理解' }
                : { icon: '🧘', name: '内心平静', reason: '在忙碌中保持觉察' },
              !hasLifeBalance 
                ? { icon: '🌈', name: '生活热情', reason: '别让工作吞噬了生活的色彩' }
                : { icon: '👨‍👩‍👧', name: '重要关系', reason: '人际连接是幸福的重要来源' }
            ]
          },

          // 时间调整建议 - 具体可行
          timeAdjustment: {
            title: '⏰ 具体调整建议',
            suggestions: [
              overworked.length > 0 && overworked[0].diff > 1 ? `📉 **${overworked[0].category}时间可适当减少**：目前每天超出理想值约 ${(overworked[0].diff / days).toFixed(1)} 小时。试着设定明确的结束时间，用"截止日期效应"提高效率。` : null,
              isSleepDeprived ? `😴 **优先保障睡眠**：建议每天提前 ${Math.min(60, Math.ceil(sleepDebt / days * 60))} 分钟上床。睡眠不是浪费时间，而是为明天的效率充电。` : null,
              isNeglectingHealth ? `🏃 **每天安排运动时间**：不需要很长，15-30分钟就够。可以是散步、拉伸或任何让身体动起来的活动。把它当作"必须完成的会议"写进日程。` : null,
              isNeglectingRest ? `☕ **设置强制休息时间**：尝试番茄工作法（25分钟工作+5分钟休息），或每90分钟休息15分钟。休息不是偷懒，是为了更好地工作。` : null,
              underinvested.some(g => g.category === '兴趣') ? `🎨 **重拾一项爱好**：每周至少安排1-2小时做自己真正喜欢的事。这些"无用"的时光，往往是最滋养心灵的部分。` : null,
              '🎯 **关注"质量"而非"数量"**：在每个时间段内更专注、更投入，比单纯增加时长更有效。'
            ].filter(Boolean)
          }
        }
      };
      
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
      
      // 保存到历史记录（相同时间段覆盖旧记录）
      const historyEntry = {
        id: `${aiPeriod}_${now.toISOString().split('T')[0]}`,
        period: aiPeriod,
        periodLabel: periodLabels[aiPeriod],
        dateRange: dateRange,
        createdAt: now.getTime(),
        report: report
      };
      
      setReportHistory(prev => {
        // 查找是否有相同时间段的记录
        const existingIndex = prev.findIndex(h => h.period === aiPeriod);
        if (existingIndex >= 0) {
          // 覆盖旧记录
          const newHistory = [...prev];
          newHistory[existingIndex] = historyEntry;
          return newHistory;
        } else {
          // 添加新记录
          return [historyEntry, ...prev];
        }
      });
      
      setReportData(report);
      setIsGenerating(false);
    }, 2500);
  };

  // 计算真实时间分布数据
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // 获取今日的时间记录
  const getTodayRecords = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return timeRecords.filter(r => {
      const recordDate = new Date(r.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });
  };
  
  // 计算分类时间分布
  const calculateCategoryDistribution = () => {
    const todayRecords = getTodayRecords();
    const distribution: Record<string, { totalMinutes: number; records: Array<{ name: string; minutes: number }> }> = {};
    
    // 初始化所有分类
    timeCategories.forEach(cat => {
      distribution[cat.id] = { totalMinutes: 0, records: [] };
    });
    distribution['uncategorized'] = { totalMinutes: 0, records: [] };
    
    todayRecords.forEach(record => {
      const start = record.startTime.split(':').map(Number);
      const end = record.endTime.split(':').map(Number);
      const minutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
      
      const categoryId = record.categoryId || 'uncategorized';
      if (!distribution[categoryId]) {
        distribution[categoryId] = { totalMinutes: 0, records: [] };
      }
      distribution[categoryId].totalMinutes += minutes;
      distribution[categoryId].records.push({ name: record.name, minutes });
    });
    
    return distribution;
  };
  
  const categoryDistribution = calculateCategoryDistribution();
  const totalMinutes = Object.values(categoryDistribution).reduce((sum, cat) => sum + cat.totalMinutes, 0);
  
  // 生成饼图数据
  const pieData = timeCategories
    .map(cat => ({
      id: cat.id,
      label: cat.label,
      color: cat.color,
      icon: cat.icon,
      minutes: categoryDistribution[cat.id]?.totalMinutes || 0,
      percentage: totalMinutes > 0 ? ((categoryDistribution[cat.id]?.totalMinutes || 0) / totalMinutes) * 100 : 0,
      records: categoryDistribution[cat.id]?.records || []
    }))
    .filter(item => item.minutes > 0);
  
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
  
  // 计算饼图路径
  const generatePieSlices = () => {
    if (pieData.length === 0) return [];
    
    let currentAngle = -90; // 从顶部开始
    const slices: Array<{ path: string; color: string; id: string }> = [];
    const cx = 100, cy = 100, r = 80;
    
    pieData.forEach(item => {
      const angle = (item.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      
      const largeArc = angle > 180 ? 1 : 0;
      
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      slices.push({ path, color: item.color, id: item.id });
      
      currentAngle = endAngle;
    });
    
    return slices;
  };

  // 习惯打卡数据
  const habits = [
    { id: '1', name: '早起', icon: '🌅', streak: 7, completed: true },
    { id: '2', name: '运动', icon: '🏃', streak: 3, completed: false },
    { id: '3', name: '阅读', icon: '📚', streak: 12, completed: true },
    { id: '4', name: '冥想', icon: '🧘', streak: 5, completed: false },
  ];

  const tabs = [
    { id: 'progress' as const, label: '当前进度' },
    { id: 'ai' as const, label: 'AI复盘' },
    { id: 'habits' as const, label: '习惯打卡' },
  ];

  const aiPeriods = [
    { id: 'yesterday' as const, label: '昨日' },
    { id: 'today' as const, label: '今日' },
    { id: 'week' as const, label: '本周' },
    { id: 'month' as const, label: '本月' },
    { id: 'history' as const, label: '历史' },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute -right-10 top-10 w-40 h-40 rounded-full bg-sky-100 blur-2xl opacity-50"></div>
      <div className="absolute -left-10 bottom-40 w-32 h-32 rounded-full bg-rose-100 blur-xl opacity-40"></div>
      
      {/* 头部 */}
      <div className="px-6 pt-8 pb-2 z-10">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-2xl font-black text-sky-600">数据复盘</h2>
          <div className="w-2 h-2 rounded-full bg-rose-200 ring-2 ring-sky-200"></div>
        </div>
        
        {/* 主Tab切换 */}
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-sky-600 shadow-sm' 
                  : 'text-gray-500'
              }`}
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
            {/* 时间分布饼图 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-5 shadow-sm mb-6 border-2 border-sky-100">
              <h4 className="font-black text-sky-700 mb-4">📊 今日时间分布</h4>
              
              {totalMinutes === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <Clock size={32} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm">今日暂无时间记录</p>
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
                          {catData.records.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">该分类下暂无记录</p>
                          ) : (
                            catData.records.map((record, idx) => (
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
                            fill={slice.color}
                            className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                            onClick={() => setSelectedCategory(slice.id)}
                          />
                        ))}
                        {/* 中心圆 */}
                        <circle cx="100" cy="100" r="50" fill="white" />
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
                  <div className="grid grid-cols-2 gap-2">
                    {pieData.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedCategory(item.id)}
                        className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all text-left"
                      >
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-sm">{item.icon}</span>
                            <span className="text-sm font-bold text-gray-700 truncate">{item.label}</span>
                          </div>
                          <p className="text-xs text-gray-400">
                            {item.minutes >= 60 
                              ? `${Math.floor(item.minutes / 60)}h ${item.minutes % 60}m`
                              : `${item.minutes}m`
                            } · {item.percentage.toFixed(0)}%
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI复盘 */}
        {activeTab === 'ai' && (
          <div className="pt-4">
            {/* 时间段选择 */}
            <div className="flex gap-1 mb-6">
              {aiPeriods.map(period => (
                <button
                  key={period.id}
                  onClick={() => { setAiPeriod(period.id); if (period.id !== 'history') setReportData(null); setViewingHistoryReport(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    aiPeriod === period.id 
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' 
                      : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                >
                  {period.label}
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
                    
                    {/* 评分卡片 */}
                    <div className="bg-gradient-to-br from-sky-400 to-indigo-500 rounded-[2rem] p-5 text-white relative overflow-hidden shadow-lg shadow-sky-200">
                      <div className="absolute top-3 right-3 opacity-20">
                        <Award size={50} />
                      </div>
                      <div className="relative z-10">
                        <h3 className="text-sm font-bold opacity-80 mb-1">{viewingHistoryReport.period}综合评分</h3>
                        <div className="flex items-end gap-2">
                          <span className="text-4xl font-black">{viewingHistoryReport.score}</span>
                          <span className="text-lg opacity-80 mb-1">/ 100</span>
                        </div>
                      </div>
                    </div>

                    {/* Summary 总结 */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                          <Lightbulb size={18} className="text-purple-500" />
                        </div>
                        <h4 className="font-black text-gray-800 text-lg">📋 Summary 总结</h4>
                      </div>
                      <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                        <p dangerouslySetInnerHTML={{ __html: viewingHistoryReport.summary.overview.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-800">$1</strong>') }} />
                        <p dangerouslySetInnerHTML={{ __html: viewingHistoryReport.summary.moodAnalysis.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-800">$1</strong>') }} />
                        <p dangerouslySetInnerHTML={{ __html: viewingHistoryReport.summary.timeOverview.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-800">$1</strong>') }} />
                      </div>
                    </div>

                    {/* 透支风险 */}
                    <div className={`rounded-2xl p-4 border-2 ${
                      viewingHistoryReport.insights.burnoutRisk.level === 'danger' 
                        ? 'bg-red-50 border-red-200'
                        : viewingHistoryReport.insights.burnoutRisk.level === 'warning' 
                          ? 'bg-amber-50 border-amber-200' 
                          : 'bg-green-50 border-green-200'
                    }`}>
                      <h4 className={`font-bold mb-2 ${
                        viewingHistoryReport.insights.burnoutRisk.level === 'danger' ? 'text-red-700' :
                        viewingHistoryReport.insights.burnoutRisk.level === 'warning' ? 'text-amber-700' : 'text-green-700'
                      }`}>
                        {viewingHistoryReport.insights.burnoutRisk.title}
                      </h4>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{viewingHistoryReport.insights.burnoutRisk.content}</p>
                    </div>

                    {/* Advice 建议 */}
                    <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl p-5 border-2 border-sky-100">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center">
                          <Brain size={18} className="text-sky-500" />
                        </div>
                        <h4 className="font-black text-sky-800 text-lg">💡 Advice 建议</h4>
                      </div>
                      
                      <div className="mb-4">
                        <h5 className="font-bold text-gray-700 mb-2">{viewingHistoryReport.advice.futureVision.title}</h5>
                        <div className="bg-white/60 rounded-xl p-3 space-y-2">
                          <p className="text-sm text-green-700 whitespace-pre-line">{viewingHistoryReport.advice.futureVision.positive}</p>
                          <p className="text-sm text-amber-700 whitespace-pre-line">{viewingHistoryReport.advice.futureVision.warning}</p>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-bold text-gray-700 mb-2">{viewingHistoryReport.advice.protectList.title}</h5>
                        <div className="grid grid-cols-3 gap-2">
                          {viewingHistoryReport.advice.protectList.items.map((item: any, i: number) => (
                            <div key={i} className="bg-white/60 rounded-xl p-3 text-center">
                              <div className="text-2xl mb-1">{item.icon}</div>
                              <p className="text-xs font-bold text-gray-700">{item.name}</p>
                              <p className="text-[10px] text-gray-500 mt-1">{item.reason}</p>
                            </div>
                          ))}
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
                              <div className="flex items-center gap-2">
                                <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                                  history.report.score >= 80 ? 'bg-green-100 text-green-600' :
                                  history.report.score >= 60 ? 'bg-yellow-100 text-yellow-600' :
                                  'bg-red-100 text-red-600'
                                }`}>
                                  {history.report.score}分
                                </div>
                                <ChevronRight size={16} className="text-gray-400" />
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-50">
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {history.report.insights.burnoutRisk.title} · {new Date(history.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : isGenerating ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-[1.5rem] mx-auto mb-4 flex items-center justify-center animate-pulse shadow-lg shadow-sky-200">
                  <Brain size={32} className="text-white" />
                </div>
                <h3 className="text-lg font-black text-sky-600 mb-2">AI 正在分析中...</h3>
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
                {/* 评分卡片 */}
                <div className="bg-gradient-to-br from-sky-400 to-indigo-500 rounded-[2rem] p-5 text-white relative overflow-hidden shadow-lg shadow-sky-200">
                  <div className="absolute top-3 right-3 opacity-20">
                    <Award size={50} />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-sm font-bold opacity-80 mb-1">{reportData.period}综合评分</h3>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black">{reportData.score}</span>
                      <span className="text-lg opacity-80 mb-1">/ 100</span>
                    </div>
                  </div>
                </div>

                {/* ===== Summary 总结部分 ===== */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Lightbulb size={18} className="text-purple-500" />
                    </div>
                    <h4 className="font-black text-gray-800 text-lg">📋 Summary 总结</h4>
                  </div>
                  
                  <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                    <p dangerouslySetInnerHTML={{ __html: reportData.summary.overview.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-800">$1</strong>') }} />
                    <p dangerouslySetInnerHTML={{ __html: reportData.summary.moodAnalysis.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-800">$1</strong>') }} />
                    <p dangerouslySetInnerHTML={{ __html: reportData.summary.timeOverview.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-800">$1</strong>') }} />
                  </div>
                </div>

                {/* 透支风险提示 */}
                <div className={`rounded-2xl p-4 border-2 ${
                  reportData.insights.burnoutRisk.level === 'warning' 
                    ? 'bg-amber-50 border-amber-200' 
                    : 'bg-green-50 border-green-200'
                }`}>
                  <h4 className={`font-bold mb-2 ${
                    reportData.insights.burnoutRisk.level === 'warning' ? 'text-amber-700' : 'text-green-700'
                  }`}>
                    {reportData.insights.burnoutRisk.title}
                  </h4>
                  <p className="text-sm text-gray-600">{reportData.insights.burnoutRisk.content}</p>
                </div>

                {/* 理想与现实差距 */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
                  <h4 className="font-bold text-gray-800 mb-3">{reportData.insights.gapAnalysis.title}</h4>
                  
                  {reportData.insights.gapAnalysis.overItems.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-red-500 font-bold mb-2">⬆️ 超出理想</p>
                      {reportData.insights.gapAnalysis.overItems.map((item: any, i: number) => (
                        <p key={i} className="text-sm text-gray-600 ml-4" dangerouslySetInnerHTML={{ 
                          __html: item.message.replace(/\*\*(.*?)\*\*/g, '<strong class="text-red-600">$1</strong>') 
                        }} />
                      ))}
                    </div>
                  )}
                  
                  {reportData.insights.gapAnalysis.underItems.length > 0 && (
                    <div>
                      <p className="text-xs text-blue-500 font-bold mb-2">⬇️ 低于理想</p>
                      {reportData.insights.gapAnalysis.underItems.map((item: any, i: number) => (
                        <p key={i} className="text-sm text-gray-600 ml-4" dangerouslySetInnerHTML={{ 
                          __html: item.message.replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-600">$1</strong>') 
                        }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* 行为洞察 */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
                  <h4 className="font-bold text-gray-800 mb-3">{reportData.insights.habits.title}</h4>
                  
                  {reportData.insights.habits.positive.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-green-600 font-bold mb-2">💚 坚持下去有益处</p>
                      {reportData.insights.habits.positive.map((item: string, i: number) => (
                        <p key={i} className="text-sm text-gray-600 mb-1">{item}</p>
                      ))}
                    </div>
                  )}
                  
                  {reportData.insights.habits.negative.length > 0 && (
                    <div>
                      <p className="text-xs text-orange-500 font-bold mb-2">🧡 需要注意调整</p>
                      {reportData.insights.habits.negative.map((item: string, i: number) => (
                        <p key={i} className="text-sm text-gray-600 mb-1">{item}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* ===== Advice 建议部分 ===== */}
                <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl p-5 border-2 border-sky-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center">
                      <Brain size={18} className="text-sky-500" />
                    </div>
                    <h4 className="font-black text-sky-800 text-lg">💡 Advice 建议</h4>
                  </div>

                  {/* 三个月愿景 */}
                  <div className="mb-5">
                    <h5 className="font-bold text-gray-700 mb-2">{reportData.advice.futureVision.title}</h5>
                    <div className="bg-white/60 rounded-xl p-3 space-y-2">
                      <p className="text-sm text-green-700">✨ {reportData.advice.futureVision.positive}</p>
                      <p className="text-sm text-amber-700">💭 {reportData.advice.futureVision.warning}</p>
                    </div>
                  </div>

                  {/* 最需要保护的三件事 */}
                  <div className="mb-5">
                    <h5 className="font-bold text-gray-700 mb-2">{reportData.advice.protectList.title}</h5>
                    <div className="grid grid-cols-3 gap-2">
                      {reportData.advice.protectList.items.map((item: any, i: number) => (
                        <div key={i} className="bg-white/60 rounded-xl p-3 text-center">
                          <div className="text-2xl mb-1">{item.icon}</div>
                          <p className="text-xs font-bold text-gray-700">{item.name}</p>
                          <p className="text-[10px] text-gray-500 mt-1">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 时间调整建议 */}
                  <div>
                    <h5 className="font-bold text-gray-700 mb-2">{reportData.advice.timeAdjustment.title}</h5>
                    <div className="space-y-2">
                      {reportData.advice.timeAdjustment.suggestions.map((suggestion: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 bg-white/60 rounded-xl p-3">
                          <span className="text-sky-500 font-bold">{i + 1}.</span>
                          <p className="text-sm text-gray-700 flex-1" dangerouslySetInnerHTML={{ 
                            __html: suggestion.replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-700">$1</strong>') 
                          }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-sky-100 rounded-[2rem] mx-auto mb-4 flex items-center justify-center">
                  <Brain size={40} className="text-sky-400" />
                </div>
                <p className="text-gray-500 text-sm mb-6">点击下方按钮生成{aiPeriods.find(p => p.id === aiPeriod)?.label}的AI复盘报告</p>
                <Button onClick={generateReport} style={{ backgroundColor: '#7dd3fc' }}>
                  <Brain size={20} />
                  生成 AI 复盘报告
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 习惯打卡 */}
        {activeTab === 'habits' && (
          <div className="pt-4 space-y-3">
            {habits.map(habit => (
              <div 
                key={habit.id}
                className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${
                  habit.completed ? 'border-green-200 bg-green-50/50' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl">
                    {habit.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-700">{habit.name}</h4>
                    <p className="text-xs text-gray-400">已连续 {habit.streak} 天</p>
                  </div>
                  <button 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      habit.completed 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <CheckCircle size={20} />
                  </button>
                </div>
              </div>
            ))}
            
            {/* 添加习惯按钮 */}
            <button className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 font-bold flex items-center justify-center gap-2 hover:border-gray-400 hover:text-gray-500 transition-all">
              <Plus size={20} />
              添加新习惯
            </button>
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
  setNewTaskDuration
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
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState<string>('');
  
  // 计时器状态
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0); // 正计时用
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [timerMode, setTimerMode] = useState<'countdown' | 'countup' | 'pomodoro'>('countdown');
  
  // 番茄钟状态
  const [pomodoroConfig, setPomodoroConfig] = useState({
    workDuration: 25,
    breakDuration: 5,
    rounds: 4,
    longBreakDuration: 15
  });
  const [currentPomodoroRound, setCurrentPomodoroRound] = useState(1);
  const [pomodoroPhase, setPomodoroPhase] = useState<'work' | 'break' | 'longBreak'>('work');
  
  // 计时模式选择弹窗
  const [showTimerModeModal, setShowTimerModeModal] = useState(false);
  const [pendingTimerTask, setPendingTimerTask] = useState<{id: string, duration: number} | null>(null);
  
  // 编辑模式状态
  const [isEditMode, setIsEditMode] = useState(false);

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
              return 0;
            }
            return prev - 1;
          });
        } else if (timerMode === 'pomodoro') {
          // 番茄钟模式
          setRemainingTime(prev => {
            if (prev <= 1) {
              // 当前阶段结束，切换到下一阶段
              if (pomodoroPhase === 'work') {
                // 工作结束，判断是否需要长休息
                if (currentPomodoroRound >= pomodoroConfig.rounds) {
                  setPomodoroPhase('longBreak');
                  setCurrentPomodoroRound(1);
                  return pomodoroConfig.longBreakDuration * 60;
                } else {
                  setPomodoroPhase('break');
                  return pomodoroConfig.breakDuration * 60;
                }
              } else if (pomodoroPhase === 'break') {
                // 短休息结束，开始下一轮工作
                setPomodoroPhase('work');
                setCurrentPomodoroRound(prev => prev + 1);
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

  // 打开计时模式选择弹窗
  const openTimerModeModal = (taskId: string, duration: number) => {
    setPendingTimerTask({ id: taskId, duration });
    // 设置番茄钟默认参数与全局番茄钟设置一致
    setPomodoroConfig({
      workDuration: pomodoroSettings.workDuration,
      breakDuration: pomodoroSettings.breakDuration,
      rounds: pomodoroSettings.rounds,
      longBreakDuration: pomodoroSettings.longBreakDuration
    });
    setShowTimerModeModal(true);
  };

  // 确认开始计时
  const confirmStartTimer = (mode: 'countdown' | 'countup' | 'pomodoro') => {
    if (!pendingTimerTask) return;
    
    setTimerMode(mode);
    setActiveTimerId(pendingTimerTask.id);
    
    if (mode === 'countup') {
      setElapsedTime(0);
    } else if (mode === 'countdown') {
      setRemainingTime(pendingTimerTask.duration * 60);
    } else if (mode === 'pomodoro') {
      setRemainingTime(pomodoroConfig.workDuration * 60);
      setPomodoroPhase('work');
      setCurrentPomodoroRound(1);
    }
    
    setTimerStatus('running');
    setShowTimerModeModal(false);
    setPendingTimerTask(null);
  };

  // 开始计时（旧方法保留兼容）
  const startTimer = (taskId: string, duration: number) => {
    openTimerModeModal(taskId, duration);
  };

  // 暂停计时
  const pauseTimer = () => {
    setTimerStatus('paused');
  };

  // 继续计时
  const resumeTimer = () => {
    setTimerStatus('running');
  };

  // 停止计时
  const stopTimer = () => {
    setActiveTimerId(null);
    setRemainingTime(0);
    setElapsedTime(0);
    setTimerStatus('idle');
    setPomodoroPhase('work');
    setCurrentPomodoroRound(1);
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

  const callDeepSeekAPI = async (prompt: string) => {
    try {
      const response = await fetch('/api/deepseek/v1/chat/completions', {
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
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
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

      const prompt = `请为我制定今日时间安排：

当前时间：${currentHour}:${currentMinute.toString().padStart(2, '0')}
睡觉时间：${bedtime}

今日任务：${tasksText || '无特定任务'}
需要安排的生活事项：${lifestyleText || '无'}
当前精神状态：${mentalStatusText}
当前身体状态：${bodyStatusText}
${pomodoroInfo}

请根据以上信息，制定一个合理的时间安排。要求：
1. 考虑当前时间，从现在开始安排
2. 根据精神状态调整任务难度和休息时间
3. 合理安排生活事项（用餐、洗漱等）
4. 确保在睡觉时间前完成所有安排
5. 任务之间留出适当的休息时间
6. 每个任务都要给出一条简短的执行建议（advice字段）
7. 对于需要久坐（持续时间超过40分钟）的任务，需要按照番茄钟设置拆分成多个番茄钟时间段（pomodoroSlots字段），每个时间段包含工作开始时间、工作结束时间、休息结束时间

请以JSON格式返回，格式如下：
{
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
- 番茄钟时间段要严格按照设置：工作${pomodoroSettings.workDuration}分钟，休息${pomodoroSettings.breakDuration}分钟，每${pomodoroSettings.rounds}轮后长休息${pomodoroSettings.longBreakDuration}分钟`;

      setGeneratingStatus('正在调用DeepSeek API...');
      const aiResponse = await callDeepSeekAPI(prompt);
      
      setGeneratingStatus('正在解析AI响应...');
      // 解析AI返回的JSON
      let parsedSchedule;
      try {
        // 尝试提取JSON部分
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedSchedule = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('无法从AI响应中提取JSON');
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
        schedule: scheduleWithTimestamps
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
      <div className="flex flex-col h-full items-center justify-center p-6 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute -right-10 top-10 w-40 h-40 rounded-full bg-teal-100 blur-2xl opacity-50"></div>
        <div className="absolute -left-10 bottom-20 w-32 h-32 rounded-full bg-orange-100 blur-xl opacity-40"></div>
        
        <div className="text-center z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-emerald-400 rounded-[2rem] mx-auto mb-6 flex items-center justify-center animate-pulse shadow-lg shadow-teal-200">
            <Brain size={40} className="text-white" />
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
      <div className="flex flex-col h-full bg-[#FFFDF7]">
        {/* 头部 */}
        <div className="px-6 pt-8 pb-4 flex justify-between items-center">
          <button 
            onClick={() => setStep('setup')}
            className="text-gray-400 hover:text-gray-600 p-2 -ml-2"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="font-bold text-[#2D2D2D]">今日规划</span>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <button 
                onClick={saveScheduleChanges}
                className="text-green-500 font-bold p-2"
              >
                <Save size={20} />
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
              📝 编辑模式：拖动调整顺序，点击删除事项，保存后自动重排时间
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* 睡觉时间提醒 */}
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl p-5 text-white mb-6 relative overflow-hidden">
            <div className="absolute top-4 right-4 opacity-20">
              <Moon size={40} />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-black mb-1">建议睡觉时间</h3>
              <p className="text-2xl font-black">{bedtime}</p>
              <p className="text-sm opacity-90 mt-1">保证充足睡眠，明天更有活力</p>
            </div>
          </div>

          {/* 时间安排列表 */}
          <div className="space-y-3">
            {scheduleData.schedule.map((item: any, index: number) => {
              const typeColors = {
                pomodoro: { bg: '#42D4A4', light: '#E0F9F1' },
                life: { bg: '#FF9F1C', light: '#FFF2DB' },
                rest: { bg: '#6CB6FF', light: '#EAF4FF' }
              };
              const colors = typeColors[item.type as keyof typeof typeColors] || typeColors.pomodoro;
              const isActive = activeTimerId === (item.id || `task-${index}`);
              const taskId = item.id || `task-${index}`;
              
              return (
                <div 
                  key={taskId} 
                  className={`bg-white rounded-3xl p-4 shadow-sm border-2 transition-all ${
                    isActive ? 'border-green-400 shadow-lg' : isEditMode ? 'border-blue-200' : 'border-gray-50'
                  }`}
                >
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
                      <button
                        onClick={() => deleteScheduleItem(index)}
                        className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
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
                        
                        <div className="text-4xl font-black text-[#2D2D2D] font-mono mb-2">
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
                              className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-white shadow-lg hover:bg-yellow-600 transition-all"
                            >
                              <div className="flex gap-1">
                                <div className="w-1.5 h-5 bg-white rounded-sm"></div>
                                <div className="w-1.5 h-5 bg-white rounded-sm"></div>
                              </div>
                            </button>
                          ) : (
                            <button
                              onClick={resumeTimer}
                              className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg hover:bg-green-600 transition-all"
                            >
                              <Play size={20} fill="white" />
                            </button>
                          )}
                          <button
                            onClick={stopTimer}
                            className="w-12 h-12 rounded-full bg-red-400 flex items-center justify-center text-white shadow-lg hover:bg-red-500 transition-all"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: colors.light }}
                    >
                      <span className="text-xl">{item.icon}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-[#2D2D2D] text-sm mb-1">{item.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatTime(item.start)} - {formatTime(item.end)}</span>
                        <span>•</span>
                        <span>{item.duration}分钟</span>
                      </div>
                      {/* AI建议 */}
                      {item.advice && !isEditMode && (
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          💡 {item.advice}
                        </p>
                      )}
                    </div>
                    
                    {!isActive && !isEditMode && (
                      <button 
                        onClick={() => startTimer(taskId, item.duration)}
                        disabled={activeTimerId !== null}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all ${
                          activeTimerId !== null ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: colors.bg }}
                      >
                        <Play size={16} fill="white" />
                      </button>
                    )}
                  </div>
                  
                  {/* 番茄钟时间段 */}
                  {item.pomodoroSlots && item.pomodoroSlots.length > 0 && !isEditMode && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Timer size={14} className="text-red-400" />
                        <span className="text-xs font-bold text-gray-500">番茄钟时间段</span>
                      </div>
                      <div className="space-y-2">
                        {item.pomodoroSlots.map((slot: any, slotIndex: number) => (
                          <div 
                            key={slotIndex} 
                            className={`flex items-center gap-2 text-xs p-2 rounded-xl ${
                              slot.isLongBreak ? 'bg-purple-50' : 'bg-red-50'
                            }`}
                          >
                            <span className="font-bold text-gray-600">第{slotIndex + 1}轮</span>
                            <span className="text-gray-500">
                              🎯 {slot.workStart}-{slot.workEnd}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className={slot.isLongBreak ? 'text-purple-500' : 'text-green-500'}>
                              {slot.isLongBreak ? '🌴' : '☕'} 休息至 {slot.breakEnd}
                            </span>
                            {slot.isLongBreak && (
                              <span className="text-purple-400 text-[10px]">(长休息)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 底部按钮 */}
          <div className="mt-8">
            {isEditMode ? (
              <div className="flex gap-3">
                <Button 
                  onClick={() => setIsEditMode(false)}
                  variant="outline"
                  className="flex-1"
                >
                  取消
                </Button>
                <Button 
                  onClick={saveScheduleChanges}
                  className="flex-1"
                  style={{ backgroundColor: '#42D4A4' }}
                >
                  <Save size={18} />
                  保存修改
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => setStep('setup')}
                variant="outline"
                style={{ borderColor: '#42D4A4', color: '#42D4A4' }}
              >
                <Edit3 size={20} />
                重新规划
              </Button>
            )}
          </div>
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
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute -right-10 top-10 w-40 h-40 rounded-full bg-teal-100 blur-2xl opacity-50"></div>
      <div className="absolute -left-10 bottom-40 w-32 h-32 rounded-full bg-orange-100 blur-xl opacity-40"></div>
      
      {/* 头部 */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-end z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-teal-700 mb-2">智能规划</h2>
            <div className="w-2 h-2 rounded-full bg-orange-200 ring-2 ring-teal-200"></div>
          </div>
          <p className="text-[10px] font-bold text-teal-500 uppercase tracking-wider">
            AI PLANNING
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 z-10">
        {/* 添加任务 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-5 shadow-sm mb-6 border-2 border-teal-100">
          <h3 className="font-black text-teal-700 mb-4 flex items-center gap-2">
            <ListTodo size={20} className="text-teal-500" />
            今日任务
          </h3>
          
          <div className="space-y-3 mb-4">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 bg-teal-50 rounded-2xl border border-teal-100">
                <div className="flex-1">
                  <span className="font-bold text-sm text-teal-700">{task.name}</span>
                  <span className="text-xs text-teal-500 ml-2">
                    {task.duration >= 60 
                      ? `${Math.floor(task.duration / 60)}小时${task.duration % 60 > 0 ? task.duration % 60 + '分钟' : ''}`
                      : `${task.duration}分钟`
                    }
                  </span>
                </div>
                <button 
                  onClick={() => removeTask(task.id)}
                  className="text-teal-300 hover:text-red-400 p-1 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* 任务名称输入 */}
          <div className="space-y-3">
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="输入任务名称..."
              className="w-full bg-white rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-teal-200 shadow-sm"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newTaskName.trim()) {
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
                  className="flex-1 h-2 bg-teal-100 rounded-lg appearance-none cursor-pointer accent-teal-500"
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
              className="w-full h-12 rounded-xl flex items-center justify-center text-white font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#80E862' }}
            >
              <Plus size={20} className="mr-2" />
              添加任务
            </button>
          </div>
        </div>

        {/* 生活状态 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 border border-gray-50">
          <h3 className="font-black text-[#2D2D2D] mb-4 flex items-center gap-2">
            <Utensils size={20} className="text-orange-500" />
            生活状态
          </h3>
          <p className="text-xs text-gray-400 mb-4">点亮已经完成的事情，未完成的事情将自动纳入计划。</p>
          
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

        {/* 精神状态 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 border border-gray-50">
          <h3 className="font-black text-[#2D2D2D] mb-4 flex items-center gap-2">
            <Zap size={20} className="text-yellow-500" />
            精神状态
          </h3>
          
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'energetic', label: '充沛', emoji: '⚡', color: '#FFD23F' },
              { id: 'normal', label: '正常', emoji: '😊', color: '#42D4A4' },
              { id: 'tired', label: '疲惫', emoji: '😴', color: '#6CB6FF' },
              { id: 'anxious', label: '焦虑', emoji: '😰', color: '#FF8CA1' },
              { id: 'nervous', label: '紧张', emoji: '😬', color: '#B589F6' },
              { id: 'sad', label: '伤心', emoji: '😢', color: '#7dd3fc' },
              { id: 'angry', label: '生气', emoji: '😠', color: '#f87171' }
            ].map(status => (
              <button
                key={status.id}
                onClick={() => setMentalStatus(status.id as any)}
                className={`p-2 rounded-2xl border-2 transition-all ${
                  mentalStatus === status.id
                    ? 'border-2 shadow-md'
                    : 'border-gray-200 opacity-60'
                }`}
                style={{
                  borderColor: mentalStatus === status.id ? status.color : undefined,
                  backgroundColor: mentalStatus === status.id ? status.color + '20' : '#F9FAFB'
                }}
              >
                <div className="text-xl mb-1">{status.emoji}</div>
                <div className="text-[10px] font-bold text-gray-700">{status.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 身体状态 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 border border-gray-50">
          <h3 className="font-black text-[#2D2D2D] mb-4 flex items-center gap-2">
            <Heart size={20} className="text-red-400" />
            身体状态
          </h3>
          
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

        {/* 睡觉时间 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 border border-gray-50">
          <h3 className="font-black text-[#2D2D2D] mb-4 flex items-center gap-2">
            <Moon size={20} className="text-purple-500" />
            睡觉时间
          </h3>
          
          <input
            type="time"
            value={bedtime}
            onChange={(e) => setBedtime(e.target.value)}
            className="w-full bg-gray-50 rounded-xl px-4 py-3 text-lg font-bold text-center outline-none focus:bg-white focus:ring-2 focus:ring-purple-200"
          />
        </div>

        {/* 生成规划按钮 */}
        <Button 
          onClick={generateSchedule}
          disabled={tasks.length === 0 || isGenerating}
          style={{ backgroundColor: '#42D4A4' }}
        >
          {isGenerating ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Brain size={20} />
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
  setIdealTimeAllocation
}: { 
  pomodoroSettings: PomodoroSettings;
  setPomodoroSettings: (settings: PomodoroSettings) => void;
  timeRecords: TimeRecord[];
  setTimeRecords: (records: TimeRecord[]) => void;
  journals: Journal[];
  idealTimeAllocation: Record<string, number>;
  setIdealTimeAllocation: (allocation: Record<string, number>) => void;
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

  // 格式化日期显示
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute -right-10 top-10 w-40 h-40 rounded-full bg-yellow-100 blur-2xl opacity-50"></div>
      <div className="absolute -left-10 bottom-40 w-32 h-32 rounded-full bg-blue-100 blur-xl opacity-40"></div>
      
      {/* 头部 */}
      <div className="px-6 pt-8 pb-4 z-10">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-yellow-700 mb-2">个人设置</h2>
          <div className="w-2 h-2 rounded-full bg-blue-200 ring-2 ring-yellow-200"></div>
        </div>
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
              <button 
                onClick={() => {
                  setShowDataManageModal(false);
                  setEditingRecord(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            {timeRecords.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10">
                <Database size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-400 text-sm">暂无数据记录</p>
                <p className="text-gray-300 text-xs mt-1">计时器完成或导入数据后会显示在这里</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3">
                {timeRecords.map(record => (
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
                            {formatDateDisplay(record.date)} · {record.startTime} - {record.endTime}
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
            )}
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

  // 全局时间记录数据
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);

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

  // PlanView 持久化状态 - 切换tab时保留
  const [planStep, setPlanStep] = useState<'setup' | 'generating' | 'schedule'>('setup');
  const [planScheduleData, setPlanScheduleData] = useState<any>(null);
  const [planTasks, setPlanTasks] = useState<Array<{id: string, name: string, duration: number}>>([]);
  const [planBedtime, setPlanBedtime] = useState('00:00');
  const [planLifestyle, setPlanLifestyle] = useState({
    morningWash: true,
    breakfast: true,
    lunch: false,
    dinner: false,
    nightWash: false
  });
  const [planMentalStatus, setPlanMentalStatus] = useState<'energetic' | 'normal' | 'tired' | 'anxious' | 'nervous' | 'sad' | 'angry'>('normal');
  const [planBodyStatus, setPlanBodyStatus] = useState<'good' | 'backPain' | 'headache' | 'periodPain' | 'wristPain'>('good');
  const [planNewTaskName, setPlanNewTaskName] = useState('');
  const [planNewTaskDuration, setPlanNewTaskDuration] = useState(25);

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
      case 'timer': return <TimerView selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />;
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
      />;
      case 'settings': return <SettingsView pomodoroSettings={pomodoroSettings} setPomodoroSettings={setPomodoroSettings} timeRecords={timeRecords} setTimeRecords={setTimeRecords} journals={journals} idealTimeAllocation={idealTimeAllocation} setIdealTimeAllocation={setIdealTimeAllocation} />;
      default: return <TimerView selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />;
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

  // 获取当前页面的渐变背景
  const currentGradient = MACARON_COLORS.gradients[activeTab] || MACARON_COLORS.gradients.timer;

  return (
    <div className={`iphone-container overflow-hidden mx-auto bg-gradient-to-br ${currentGradient} transition-all duration-700`}>
      <div className="flex-1 h-full relative">
        <div className="h-[calc(100%-96px)]">
          {renderView()}
        </div>
        
        {/* 底部导航栏 - 玻璃拟态升级版 */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-xl rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.03)] border-t border-white/60 pb-2">
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
    </div>
  );
}