import { useState, useEffect } from 'react';
import { 
  Timer, BookHeart, PieChart, Calendar, Settings2, 
  Plus, Heart, Play, Clock, Smartphone, ChevronRight,
  ArrowRight, Sparkles, Target, Coffee, Zap,
  Edit3, Save, X, Camera, ChevronLeft,
  TrendingUp, Award, CheckCircle, RefreshCw, Brain, Lightbulb,
  ListTodo, Moon, Utensils,
  Bell, Shield, Palette, Volume2, LogOut, Download, Upload
} from 'lucide-react';

// 类型定义
type CategoryId = 'work' | 'study' | 'rest' | 'life';
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
  icon: string;
  isCustom?: boolean;
}

// 番茄钟设置接口
interface PomodoroSettings {
  workDuration: number;      // 工作时长（分钟）
  breakDuration: number;     // 休息时长（分钟）
  rounds: number;            // 几轮后长休息
  longBreakDuration: number; // 长休息时长（分钟）
}

// 配置常量
const MACARON_COLORS = {
  bg: '#FFFDF7',
  categories: {
    work: { primary: '#FF8CA1', light: '#FFF0F3', text: '#D9455F' },
    study: { primary: '#FFD23F', light: '#FFFBE6', text: '#B88E00' },
    rest: { primary: '#42D4A4', light: '#E0F9F1', text: '#1B8C69' },
    life: { primary: '#B589F6', light: '#F4EBFF', text: '#7E4CCB' },
  } as Record<CategoryId, CategoryTheme>,
  ui: {
    primary: '#FF8CA1', 
  },
  themes: {
    timer: '#6CB6FF',
    journal: '#FF85A1',
    review: '#B589F6',
    plan: '#42D4A4',
    settings: '#FFD23F',
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
    { id: 'work', label: '工作', icon: '💼' },
    { id: 'study', label: '学习', icon: '📚' },
    { id: 'rest', label: '休息', icon: '☕' },
    { id: 'life', label: '生活', icon: '🌞' },
  ]);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [activeTimer, setActiveTimer] = useState<Timer | null>(null);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showNewTimerModal, setShowNewTimerModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('⭐');
  const [newTimerName, setNewTimerName] = useState('');
  const [newTimerDuration, setNewTimerDuration] = useState(25);

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

  const theme = MACARON_COLORS.categories[selectedCategory as CategoryId] || {
    primary: '#FF8CA1',
    light: '#FFF0F3', 
    text: '#D9455F'
  };

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
        icon: newCategoryIcon,
        isCustom: true
      };
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      setNewCategoryIcon('⭐');
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
    <div className="flex h-full" style={{ backgroundColor: MACARON_COLORS.bg }}>
      {/* 侧边栏 */}
      <div className="w-[70px] h-full flex flex-col items-center py-6 border-r border-[#F0F0F0] bg-white/50 backdrop-blur-sm">
        <div className="space-y-2 w-full flex flex-col items-center px-1 flex-1">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            const catTheme = MACARON_COLORS.categories[cat.id as CategoryId] || {
              primary: '#FF8CA1',
              light: '#FFF0F3',
              text: '#D9455F'
            };
            return (
              <button 
                key={cat.id} 
                onClick={() => handleCategoryChange(cat.id as CategoryId)}
                className={`relative w-full py-3 rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${isSelected ? 'shadow-md scale-105' : 'hover:bg-white/80 hover:scale-105'}`}
                style={{ backgroundColor: isSelected ? catTheme.primary : 'transparent' }}
              >
                <span className="text-lg mb-1">{cat.icon}</span>
                <span className={`text-[8px] font-black ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                  {cat.label}
                </span>
              </button>
            );
          })}
          
          {/* 添加分类按钮 */}
          <button 
            onClick={() => setShowNewCategoryModal(true)}
            className="w-full py-3 rounded-xl flex flex-col items-center justify-center transition-all hover:bg-white/80 hover:scale-105 border-2 border-dashed border-gray-300"
          >
            <Plus size={16} className="text-gray-400 mb-1" />
            <span className="text-[8px] font-black text-gray-400">添加</span>
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <div className="px-6 pt-8 pb-3 flex justify-between items-end bg-gradient-to-b from-[#FFFDF7] to-transparent">
          <div>
            <h2 className="text-3xl font-black text-[#2D2D2D] tracking-tight">
              {categories.find(c => c.id === selectedCategory)?.label}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: theme.primary }}>
              FOCUS MODE
            </p>
          </div>
          <button 
            onClick={() => setShowNewTimerModal(true)}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl hover:brightness-110 active:scale-90 transition-all"
            style={{ backgroundColor: theme.primary, boxShadow: `0 10px 20px -5px ${theme.primary}66` }}
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {categoryTimers.length === 0 ? (
            // 空状态
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center opacity-60">
                <div className="w-24 h-24 rounded-full mb-4 flex items-center justify-center" style={{ backgroundColor: theme.light }}>
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
                  className={`relative w-full rounded-[32px] p-6 shadow-lg bg-white border-2 transition-all ${
                    activeTimer?.id === timer.id ? 'scale-105' : ''
                  }`}
                  style={{ 
                    borderColor: timer.status === 'running' ? theme.primary : 
                                timer.status === 'completed' ? '#42D4A4' : '#F0F0F0'
                  }}
                >
                  <div className="flex flex-col h-full justify-between items-center">
                    <div className="flex items-center gap-3 w-full">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <Clock size={24} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-black text-[#2D2D2D]">{timer.name}</h4>
                        <p className="text-xs text-gray-400">
                          {timer.status === 'idle' && '准备开始专注'}
                          {timer.status === 'running' && '专注进行中...'}
                          {timer.status === 'paused' && '已暂停'}
                          {timer.status === 'completed' && '专注完成！'}
                        </p>
                      </div>
                      <button 
                        onClick={() => deleteTimer(timer.id)}
                        className="text-gray-300 hover:text-red-400 p-2"
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
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all hover:brightness-110"
                          style={{ backgroundColor: theme.primary, boxShadow: `0 10px 20px -5px ${theme.primary}66` }}
                        >
                          <Play fill="white" size={28} className="ml-1" />
                        </button>
                      ) : timer.status === 'running' ? (
                        <button 
                          onClick={() => pauseTimer(timer)}
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all hover:brightness-110"
                          style={{ backgroundColor: theme.primary, boxShadow: `0 10px 20px -5px ${theme.primary}66` }}
                        >
                          <div className="flex gap-1">
                            <div className="w-2 h-6 bg-white rounded-sm"></div>
                            <div className="w-2 h-6 bg-white rounded-sm"></div>
                          </div>
                        </button>
                      ) : (
                        <button 
                          onClick={() => resetTimer(timer)}
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all hover:brightness-110"
                          style={{ backgroundColor: '#42D4A4', boxShadow: '0 10px 20px -5px #42D4A466' }}
                        >
                          <RefreshCw size={24} />
                        </button>
                      )}
                      
                      {(timer.status === 'running' || timer.status === 'paused') && (
                        <button 
                          onClick={() => resetTimer(timer)}
                          className="w-12 h-12 rounded-full flex items-center justify-center text-gray-400 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all"
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
          <div className="bg-white w-[85%] rounded-3xl p-6 shadow-2xl animate-scale-in">
            <h3 className="text-xl font-black text-[#2D2D2D] mb-4 text-center">新增分类</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-600 block mb-2">分类名称</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="输入分类名称..."
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-base outline-none focus:bg-white focus:ring-2 focus:ring-pink-200"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="text-sm font-bold text-gray-600 block mb-2">选择图标</label>
                <div className="grid grid-cols-6 gap-2">
                  {['⭐', '🎯', '💡', '🚀', '🎨', '🏃', '📖', '🎵', '🍎', '🌟', '💪', '🔥'].map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewCategoryIcon(icon)}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                        newCategoryIcon === icon ? 'bg-pink-100 border-2 border-pink-400' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {icon}
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
                  setNewCategoryIcon('⭐');
                }}
                className="flex-1"
              >
                取消
              </Button>
              <Button 
                onClick={addCategory}
                disabled={!newCategoryName.trim()}
                className="flex-1"
                style={{ backgroundColor: '#FF8CA1' }}
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
    </div>
  );
};

// 日记视图
const JournalView = () => {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [journals, setJournals] = useState<Journal[]>([
    {
      id: '1',
      date: Date.now() - 86400000, // 昨天
      mood: 'happy',
      content: '今天完成了一个重要的项目，感觉很有成就感！虽然过程中遇到了一些困难，但最终都克服了。',
      images: []
    }
  ]);
  const [currentJournal, setCurrentJournal] = useState<CurrentJournal>({
    content: '',
    mood: null,
    images: []
  });

  const moods = [
    { id: 'happy', emoji: '😊', label: '开心', color: '#FFD23F' },
    { id: 'calm', emoji: '😌', label: '平静', color: '#42D4A4' },
    { id: 'sad', emoji: '😔', label: '难过', color: '#6CB6FF' },
    { id: 'excited', emoji: '🤩', label: '兴奋', color: '#FF9F1C' },
    { id: 'tired', emoji: '😴', label: '疲惫', color: '#E5E5E5' }
  ];

  const openEditor = (journal: Journal | null = null) => {
    if (journal) {
      setCurrentJournal({
        content: journal.content,
        mood: journal.mood,
        images: journal.images
      });
    } else {
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
    
    const newJournal = {
      id: Date.now().toString(),
      date: Date.now(),
      mood: currentJournal.mood,
      content: currentJournal.content,
      images: currentJournal.images
    };
    
    setJournals([newJournal, ...journals]);
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
      <div className="flex flex-col h-full bg-[#FFFDF7] relative">
        {/* 编辑器头部 */}
        <div className="px-6 pt-8 pb-4 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <button 
            onClick={() => setView('list')}
            className="text-gray-400 hover:text-gray-600 p-2 -ml-2"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="font-bold text-[#2D2D2D]">写日记</span>
          <button 
            onClick={saveJournal}
            className="text-[#FF85A1] font-bold p-2 -mr-2"
            disabled={!currentJournal.content.trim()}
          >
            <Save size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
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
            <div className="flex gap-2 mb-2">
              {currentJournal.images.map((_, idx) => (
                <div key={idx} className="relative w-16 h-16 bg-gray-100 rounded-xl overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Camera size={20} />
                  </div>
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
              {currentJournal.images.length < 4 && (
                <button 
                  onClick={() => setCurrentJournal({
                    ...currentJournal, 
                    images: [...currentJournal.images, 'placeholder']
                  })}
                  className="w-16 h-16 bg-[#F9FAFB] rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-[#FF85A1] hover:text-[#FF85A1] transition-all"
                >
                  <Camera size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FFFDF7]">
      {/* 头部 */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-[#2D2D2D] mb-2">心情日记</h2>
          <p className="text-[10px] font-bold text-[#FF85A1] uppercase tracking-wider">
            MOMENTS & THOUGHTS
          </p>
        </div>
        <button 
          onClick={() => openEditor()}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl hover:brightness-110 active:scale-90 transition-all"
          style={{ 
            backgroundColor: '#FF85A1', 
            boxShadow: '0 10px 20px -5px #FF85A166' 
          }}
        >
          <Edit3 size={20} strokeWidth={3} />
        </button>
      </div>

      {/* 日记列表 */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {journals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center opacity-60">
              <div className="w-24 h-24 rounded-full mb-4 flex items-center justify-center bg-pink-100">
                <BookHeart size={40} className="text-pink-400" />
              </div>
              <p className="text-[#2D2D2D] font-bold text-lg">记录美好时光</p>
              <p className="text-[#8A8A8A] text-sm mt-2 px-4">点击右上角开始写下今天的心情</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {journals.map(journal => {
              const mood = moods.find(m => m.id === journal.mood);
              return (
                <div 
                  key={journal.id}
                  onClick={() => openEditor(journal)}
                  className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-50"
                >
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
                          {formatDate(journal.date)}
                        </span>
                        {mood && (
                          <span className="text-xs text-gray-400">{mood.label}</span>
                        )}
                      </div>
                      <p className="text-sm text-[#2D2D2D] leading-relaxed line-clamp-3">
                        {journal.content}
                      </p>
                      {journal.images.length > 0 && (
                        <div className="flex gap-1 mt-3">
                          {journal.images.slice(0, 3).map((_, idx) => (
                            <div key={idx} className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Camera size={12} className="text-gray-400" />
                            </div>
                          ))}
                          {journal.images.length > 3 && (
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-xs text-gray-400">+{journal.images.length - 3}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// 复盘视图
const ReviewView = () => {
  const [view, setView] = useState<'overview' | 'generating' | 'report'>('overview');
  const [reportData, setReportData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 模拟数据
  const todayStats = {
    focusTime: 125, // 分钟
    completedTasks: 3,
    totalTasks: 5,
    mood: 'productive',
    categories: [
      { name: '工作', time: 75, color: '#FF8CA1' },
      { name: '学习', time: 30, color: '#FFD23F' },
      { name: '休息', time: 20, color: '#42D4A4' }
    ]
  };

  const generateReport = async () => {
    setIsGenerating(true);
    setView('generating');
    
    // 模拟AI生成过程
    setTimeout(() => {
      const mockReport = {
        summary: "今天你的专注表现很棒！总共专注了2小时5分钟，完成了3个重要任务。",
        highlights: [
          "🎯 专注效率比昨天提升了15%",
          "✅ 工作任务完成度达到60%",
          "💡 在学习上投入了30分钟，保持了良好的学习习惯"
        ],
        suggestions: [
          "建议明天适当增加休息时间，保持工作与生活的平衡",
          "可以尝试将大任务分解成更小的子任务",
          "继续保持当前的专注节奏，效果很好"
        ],
        score: 85
      };
      setReportData(mockReport);
      setIsGenerating(false);
      setView('report');
    }, 3000);
  };

  if (view === 'generating') {
    return (
      <div className="flex flex-col h-full bg-[#FFFDF7] items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-400 rounded-3xl mx-auto mb-6 flex items-center justify-center animate-pulse">
            <Brain size={40} className="text-white" />
          </div>
          <h3 className="text-xl font-black text-[#2D2D2D] mb-2">AI 正在分析中...</h3>
          <p className="text-gray-500 text-sm mb-8">正在为你生成专属的复盘报告</p>
          
          {/* 加载动画 */}
          <div className="flex justify-center gap-1 mb-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          
          <div className="text-xs text-gray-400">
            分析你的专注数据、任务完成情况和时间分配...
          </div>
        </div>
      </div>
    );
  }

  if (view === 'report' && reportData) {
    return (
      <div className="flex flex-col h-full bg-[#FFFDF7]">
        {/* 头部 */}
        <div className="px-6 pt-8 pb-4 flex justify-between items-center">
          <button 
            onClick={() => setView('overview')}
            className="text-gray-400 hover:text-gray-600 p-2 -ml-2"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="font-bold text-[#2D2D2D]">AI 复盘报告</span>
          <button className="text-[#B589F6] font-bold p-2 -mr-2">
            <RefreshCw size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* 评分卡片 */}
          <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl p-6 text-white mb-6 relative overflow-hidden">
            <div className="absolute top-4 right-4 opacity-20">
              <Award size={60} />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-black mb-2">今日评分</h3>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-black">{reportData.score}</span>
                <span className="text-lg opacity-80 mb-1">/ 100</span>
              </div>
              <p className="text-sm opacity-90">表现优秀，继续保持！</p>
            </div>
          </div>

          {/* 总结 */}
          <div className="bg-white rounded-3xl p-5 shadow-sm mb-4 border border-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Lightbulb size={20} className="text-purple-500" />
              </div>
              <h4 className="font-black text-[#2D2D2D]">今日总结</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{reportData.summary}</p>
          </div>

          {/* 亮点 */}
          <div className="bg-white rounded-3xl p-5 shadow-sm mb-4 border border-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center">
                <TrendingUp size={20} className="text-green-500" />
              </div>
              <h4 className="font-black text-[#2D2D2D]">今日亮点</h4>
            </div>
            <div className="space-y-2">
              {reportData.highlights.map((highlight: string, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 建议 */}
          <div className="bg-white rounded-3xl p-5 shadow-sm mb-4 border border-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Brain size={20} className="text-blue-500" />
              </div>
              <h4 className="font-black text-[#2D2D2D]">AI 建议</h4>
            </div>
            <div className="space-y-3">
              {reportData.suggestions.map((suggestion: string, index: number) => (
                <div key={index} className="bg-blue-50 rounded-2xl p-3">
                  <span className="text-sm text-gray-700">{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FFFDF7]">
      {/* 头部 */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-[#2D2D2D] mb-2">今日复盘</h2>
          <p className="text-[10px] font-bold text-[#B589F6] uppercase tracking-wider">
            DAILY REVIEW
          </p>
        </div>
        <button 
          onClick={generateReport}
          disabled={isGenerating}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl hover:brightness-110 active:scale-90 transition-all disabled:opacity-50"
          style={{ 
            backgroundColor: '#B589F6', 
            boxShadow: '0 10px 20px -5px #B589F666' 
          }}
        >
          <Brain size={20} strokeWidth={3} />
        </button>
      </div>

      {/* 今日数据概览 */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-50">
            <div className="flex items-center justify-between mb-2">
              <Clock size={20} className="text-blue-500" />
              <span className="text-xs text-gray-400">专注时长</span>
            </div>
            <div className="text-2xl font-black text-[#2D2D2D]">
              {Math.floor(todayStats.focusTime / 60)}h {todayStats.focusTime % 60}m
            </div>
          </div>

          <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-50">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle size={20} className="text-green-500" />
              <span className="text-xs text-gray-400">完成任务</span>
            </div>
            <div className="text-2xl font-black text-[#2D2D2D]">
              {todayStats.completedTasks}/{todayStats.totalTasks}
            </div>
          </div>
        </div>

        {/* 分类时间分布 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 border border-gray-50">
          <h4 className="font-black text-[#2D2D2D] mb-4">时间分布</h4>
          <div className="space-y-3">
            {todayStats.categories.map((category, index) => (
              <div key={index} className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm font-bold text-gray-600 flex-1">{category.name}</span>
                <span className="text-sm font-black text-[#2D2D2D]">{category.time}min</span>
              </div>
            ))}
          </div>
        </div>

        {/* 生成报告按钮 */}
        <div className="text-center">
          <Button 
            onClick={generateReport}
            disabled={isGenerating}
            style={{ backgroundColor: '#B589F6' }}
          >
            {isGenerating ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Brain size={20} />
                生成 AI 复盘报告
              </>
            )}
          </Button>
          <p className="text-xs text-gray-400 mt-3 px-4">
            AI 将分析你的专注数据，生成个性化的复盘建议
          </p>
        </div>
      </div>
    </div>
  );
};

// 计划视图
const PlanView = ({ pomodoroSettings }: { pomodoroSettings: PomodoroSettings }) => {
  const [step, setStep] = useState<'setup' | 'generating' | 'schedule'>('setup');
  const [tasks, setTasks] = useState<Array<{id: string, name: string, duration: number}>>([]);
  const [bedtime, setBedtime] = useState('22:00');
  const [lifestyle, setLifestyle] = useState({
    breakfast: true,
    lunch: false,
    dinner: false,
    morningWash: true,
    nightWash: false
  });
  const [mentalStatus, setMentalStatus] = useState<'energetic' | 'normal' | 'tired'>('normal');
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState<string>('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState(25); // 默认25分钟
  
  // 计时器状态
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused'>('idle');

  // 计时器逻辑
  useEffect(() => {
    let interval: number;
    
    if (timerStatus === 'running' && remainingTime > 0) {
      interval = window.setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            setTimerStatus('idle');
            setActiveTimerId(null);
            // 可以在这里添加完成提示音
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerStatus, remainingTime]);

  // 开始计时
  const startTimer = (taskId: string, duration: number) => {
    setActiveTimerId(taskId);
    setRemainingTime(duration * 60); // 转换为秒
    setTimerStatus('running');
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
    setTimerStatus('idle');
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
            breakfast: '早餐',
            lunch: '午餐', 
            dinner: '晚餐',
            morningWash: '晨洗',
            nightWash: '晚洗'
          };
          return labels[key];
        })
        .join('、');
      
      const mentalStatusText = {
        energetic: '精力充沛',
        normal: '状态正常',
        tired: '感到疲惫'
      }[mentalStatus];

      // 番茄钟设置说明
      const pomodoroInfo = `番茄钟设置：工作${pomodoroSettings.workDuration}分钟，休息${pomodoroSettings.breakDuration}分钟，每${pomodoroSettings.rounds}轮后长休息${pomodoroSettings.longBreakDuration}分钟`;

      const prompt = `请为我制定今日时间安排：

当前时间：${currentHour}:${currentMinute.toString().padStart(2, '0')}
睡觉时间：${bedtime}

今日任务：${tasksText || '无特定任务'}
需要安排的生活事项：${lifestyleText || '无'}
当前精神状态：${mentalStatusText}
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
      <div className="flex flex-col h-full bg-[#FFFDF7] items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-400 rounded-3xl mx-auto mb-6 flex items-center justify-center animate-pulse">
            <Brain size={40} className="text-white" />
          </div>
          <h3 className="text-xl font-black text-[#2D2D2D] mb-2">AI 正在规划中...</h3>
          <p className="text-gray-500 text-sm mb-8">DeepSeek正在为你制定最佳时间安排</p>
          
          {/* 加载动画 */}
          <div className="flex justify-center gap-1 mb-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-green-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          
          <div className="text-xs text-gray-400 space-y-1">
            <div>📋 分析你的{tasks.length}个任务</div>
            <div>🍽️ 考虑生活习惯安排</div>
            <div>⚡ 根据{mentalStatus === 'energetic' ? '充沛' : mentalStatus === 'normal' ? '正常' : '疲惫'}状态调整</div>
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
          <button 
            onClick={generateSchedule}
            className="text-[#42D4A4] font-bold p-2 -mr-2"
          >
            <RefreshCw size={20} />
          </button>
        </div>

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
                    isActive ? 'border-green-400 shadow-lg' : 'border-gray-50'
                  }`}
                >
                  {/* 计时器显示 */}
                  {isActive && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl">
                      <div className="text-center">
                        <div className="text-4xl font-black text-[#2D2D2D] font-mono mb-2">
                          {formatRemainingTime(remainingTime)}
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                          {timerStatus === 'running' ? '专注进行中...' : '已暂停'}
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
                      {item.advice && (
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          💡 {item.advice}
                        </p>
                      )}
                    </div>
                    
                    {!isActive && (
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
                  {item.pomodoroSlots && item.pomodoroSlots.length > 0 && (
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

          {/* 重新规划按钮 */}
          <div className="mt-8">
            <Button 
              onClick={() => setStep('setup')}
              variant="outline"
              style={{ borderColor: '#42D4A4', color: '#42D4A4' }}
            >
              <Edit3 size={20} />
              重新规划
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FFFDF7]">
      {/* 头部 */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-[#2D2D2D] mb-2">智能规划</h2>
          <p className="text-[10px] font-bold text-[#42D4A4] uppercase tracking-wider">
            AI PLANNING
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* 添加任务 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 border border-gray-50">
          <h3 className="font-black text-[#2D2D2D] mb-4 flex items-center gap-2">
            <ListTodo size={20} className="text-green-500" />
            今日任务
          </h3>
          
          <div className="space-y-3 mb-4">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                <div className="flex-1">
                  <span className="font-bold text-sm text-[#2D2D2D]">{task.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {task.duration >= 60 
                      ? `${Math.floor(task.duration / 60)}小时${task.duration % 60 > 0 ? task.duration % 60 + '分钟' : ''}`
                      : `${task.duration}分钟`
                    }
                  </span>
                </div>
                <button 
                  onClick={() => removeTask(task.id)}
                  className="text-gray-400 hover:text-red-400 p-1"
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
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-base outline-none focus:bg-white focus:ring-2 focus:ring-green-200"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newTaskName.trim()) {
                  addTask(newTaskName, newTaskDuration);
                }
              }}
            />
            
            {/* 时长选择 */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-600 whitespace-nowrap">预计时长</span>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="360"
                  value={newTaskDuration}
                  onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
                <span className="text-sm font-black text-[#2D2D2D] w-20 text-right">
                  {newTaskDuration >= 60 
                    ? `${Math.floor(newTaskDuration / 60)}h${newTaskDuration % 60 > 0 ? newTaskDuration % 60 + 'm' : ''}`
                    : `${newTaskDuration}min`
                  }
                </span>
              </div>
            </div>

            {/* 快捷时长选择 */}
            <div className="flex gap-2 flex-wrap">
              {[15, 30, 60, 90, 120, 180, 240, 360].map(duration => (
                <button
                  key={duration}
                  onClick={() => setNewTaskDuration(duration)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    newTaskDuration === duration
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              className="w-full h-12 bg-green-500 rounded-xl flex items-center justify-center text-white font-bold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'breakfast', label: '早餐', icon: '🍳' },
              { key: 'lunch', label: '午餐', icon: '🍽️' },
              { key: 'dinner', label: '晚餐', icon: '🍜' },
              { key: 'morningWash', label: '晨洗', icon: '🚿' }
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
          
          <div className="flex gap-3">
            {[
              { id: 'energetic', label: '充沛', emoji: '⚡', color: '#FFD23F' },
              { id: 'normal', label: '正常', emoji: '😊', color: '#42D4A4' },
              { id: 'tired', label: '疲惫', emoji: '😴', color: '#6CB6FF' }
            ].map(status => (
              <button
                key={status.id}
                onClick={() => setMentalStatus(status.id as any)}
                className={`flex-1 p-3 rounded-2xl border-2 transition-all ${
                  mentalStatus === status.id
                    ? 'border-2 shadow-md'
                    : 'border-gray-200 opacity-60'
                }`}
                style={{
                  borderColor: mentalStatus === status.id ? status.color : undefined,
                  backgroundColor: mentalStatus === status.id ? status.color + '20' : '#F9FAFB'
                }}
              >
                <div className="text-2xl mb-1">{status.emoji}</div>
                <div className="text-xs font-bold text-gray-700">{status.label}</div>
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
    </div>
  );
};

// 设置视图
const SettingsView = ({ 
  pomodoroSettings, 
  setPomodoroSettings 
}: { 
  pomodoroSettings: PomodoroSettings;
  setPomodoroSettings: (settings: PomodoroSettings) => void;
}) => {
  const [user] = useState({
    name: '治愈体验官',
    avatar: '🐱',
    phone: '+86 138****8888'
  });
  
  const [settings, setSettings] = useState({
    notifications: true,
    soundEnabled: true,
    darkMode: false,
    autoSync: true,
    language: 'zh-CN'
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    // 这里可以添加登出逻辑
    setShowLogoutConfirm(false);
    // 重置到登录页面等
  };

  const exportData = () => {
    // 模拟导出数据
    const data = {
      user,
      settings,
      exportTime: new Date().toISOString()
    };
    console.log('导出数据:', data);
    // 实际应用中这里会触发文件下载
  };

  const importData = () => {
    // 模拟导入数据
    console.log('导入数据功能');
    // 实际应用中这里会打开文件选择器
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFDF7]">
      {/* 头部 */}
      <div className="px-6 pt-8 pb-4">
        <h2 className="text-2xl font-black text-[#2D2D2D] mb-2">个人设置</h2>
        <p className="text-[10px] font-bold text-[#FFD23F] uppercase tracking-wider">
          PREFERENCES
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* 用户信息 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 border border-gray-50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-3xl flex items-center justify-center text-3xl shadow-lg">
              {user.avatar}
            </div>
            <div className="flex-1">
              <h3 className="font-black text-[#2D2D2D] text-lg">{user.name}</h3>
              <p className="text-gray-500 text-sm">{user.phone}</p>
            </div>
            <button className="text-gray-400 hover:text-[#FFD23F] p-2">
              <Edit3 size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-xl font-black text-[#2D2D2D]">127</div>
              <div className="text-xs text-gray-500">专注时长(h)</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-[#2D2D2D]">45</div>
              <div className="text-xs text-gray-500">完成任务</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-[#2D2D2D]">12</div>
              <div className="text-xs text-gray-500">使用天数</div>
            </div>
          </div>
        </div>

        {/* 番茄钟设置 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 border border-gray-50">
          <h3 className="font-black text-[#2D2D2D] mb-4 flex items-center gap-2">
            <Timer size={20} className="text-red-500" />
            番茄钟设置
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-600">工作时长</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setPomodoroSettings({...pomodoroSettings, workDuration: Math.max(5, pomodoroSettings.workDuration - 5)})}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                >
                  -
                </button>
                <span className="text-lg font-black text-[#2D2D2D] w-12 text-center">
                  {pomodoroSettings.workDuration}
                </span>
                <button 
                  onClick={() => setPomodoroSettings({...pomodoroSettings, workDuration: Math.min(60, pomodoroSettings.workDuration + 5)})}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                >
                  +
                </button>
                <span className="text-sm text-gray-500">分钟</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-600">休息时长</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setPomodoroSettings({...pomodoroSettings, breakDuration: Math.max(1, pomodoroSettings.breakDuration - 1)})}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                >
                  -
                </button>
                <span className="text-lg font-black text-[#2D2D2D] w-12 text-center">
                  {pomodoroSettings.breakDuration}
                </span>
                <button 
                  onClick={() => setPomodoroSettings({...pomodoroSettings, breakDuration: Math.min(30, pomodoroSettings.breakDuration + 1)})}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                >
                  +
                </button>
                <span className="text-sm text-gray-500">分钟</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-600">长休息间隔</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setPomodoroSettings({...pomodoroSettings, rounds: Math.max(2, pomodoroSettings.rounds - 1)})}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                >
                  -
                </button>
                <span className="text-lg font-black text-[#2D2D2D] w-12 text-center">
                  {pomodoroSettings.rounds}
                </span>
                <button 
                  onClick={() => setPomodoroSettings({...pomodoroSettings, rounds: Math.min(8, pomodoroSettings.rounds + 1)})}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                >
                  +
                </button>
                <span className="text-sm text-gray-500">轮</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-600">长休息时长</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setPomodoroSettings({...pomodoroSettings, longBreakDuration: Math.max(5, pomodoroSettings.longBreakDuration - 5)})}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                >
                  -
                </button>
                <span className="text-lg font-black text-[#2D2D2D] w-12 text-center">
                  {pomodoroSettings.longBreakDuration}
                </span>
                <button 
                  onClick={() => setPomodoroSettings({...pomodoroSettings, longBreakDuration: Math.min(60, pomodoroSettings.longBreakDuration + 5)})}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                >
                  +
                </button>
                <span className="text-sm text-gray-500">分钟</span>
              </div>
            </div>

            {/* 番茄钟说明 */}
            <div className="bg-red-50 rounded-xl p-3 mt-2">
              <p className="text-xs text-red-400">
                每完成 {pomodoroSettings.rounds} 轮（{pomodoroSettings.workDuration}分钟工作 + {pomodoroSettings.breakDuration}分钟休息）后，进入 {pomodoroSettings.longBreakDuration} 分钟长休息
              </p>
            </div>
          </div>
        </div>

        {/* 通用设置 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 border border-gray-50">
          <h3 className="font-black text-[#2D2D2D] mb-4 flex items-center gap-2">
            <Settings2 size={20} className="text-blue-500" />
            通用设置
          </h3>
          
          <div className="space-y-4">
            {[
              { key: 'notifications', label: '推送通知', icon: Bell, desc: '接收专注提醒和任务通知' },
              { key: 'soundEnabled', label: '提示音效', icon: Volume2, desc: '播放计时器提示音' },
              { key: 'autoSync', label: '自动同步', icon: RefreshCw, desc: '自动备份数据到云端' }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <item.icon size={18} className="text-gray-400" />
                  <div>
                    <div className="text-sm font-bold text-gray-700">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.desc}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({
                    ...settings,
                    [item.key]: !settings[item.key as keyof typeof settings]
                  })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings[item.key as keyof typeof settings]
                      ? 'bg-[#FFD23F]'
                      : 'bg-gray-200'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                    settings[item.key as keyof typeof settings]
                      ? 'translate-x-6'
                      : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 主题设置 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 border border-gray-50">
          <h3 className="font-black text-[#2D2D2D] mb-4 flex items-center gap-2">
            <Palette size={20} className="text-purple-500" />
            主题外观
          </h3>
          
          <div className="grid grid-cols-4 gap-3">
            {[
              { name: '治愈粉', color: '#FF8CA1' },
              { name: '阳光黄', color: '#FFD23F' },
              { name: '森林绿', color: '#42D4A4' },
              { name: '天空蓝', color: '#6CB6FF' }
            ].map(theme => (
              <button
                key={theme.name}
                className="flex flex-col items-center p-3 rounded-2xl border-2 border-gray-100 hover:border-gray-200 transition-all"
              >
                <div 
                  className="w-8 h-8 rounded-full mb-2"
                  style={{ backgroundColor: theme.color }}
                />
                <span className="text-xs font-bold text-gray-600">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 数据管理 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 border border-gray-50">
          <h3 className="font-black text-[#2D2D2D] mb-4 flex items-center gap-2">
            <Shield size={20} className="text-green-500" />
            数据管理
          </h3>
          
          <div className="space-y-3">
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
              onClick={importData}
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

        {/* 关于应用 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 border border-gray-50">
          <h3 className="font-black text-[#2D2D2D] mb-4">关于应用</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">版本号</span>
              <span className="font-bold text-gray-800">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">更新时间</span>
              <span className="font-bold text-gray-800">2024-12-21</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">开发者</span>
              <span className="font-bold text-gray-800">Kiro AI</span>
            </div>
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
    </div>
  );
};

// 主应用组件
export default function App() {
  const [appState, setAppState] = useState<'login' | 'onboarding' | 'main'>('login');
  const [activeTab, setActiveTab] = useState<TabId>('timer');
  const [isFirstTime, setIsFirstTime] = useState(true); // 模拟首次使用
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('work'); // 添加全局分类状态
  
  // 全局番茄钟设置
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>({
    workDuration: 25,
    breakDuration: 5,
    rounds: 4,
    longBreakDuration: 15
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
      case 'journal': return <JournalView />;
      case 'review': return <ReviewView />;
      case 'plan': return <PlanView pomodoroSettings={pomodoroSettings} />;
      case 'settings': return <SettingsView pomodoroSettings={pomodoroSettings} setPomodoroSettings={setPomodoroSettings} />;
      default: return <TimerView selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />;
    }
  };

  const tabs: { id: TabId; icon: typeof Timer; label: string; color: string }[] = [
    { id: 'timer', icon: Timer, label: '专注', color: MACARON_COLORS.categories[selectedCategory]?.primary || MACARON_COLORS.themes.timer },
    { id: 'journal', icon: BookHeart, label: '日记', color: MACARON_COLORS.themes.journal },
    { id: 'review', icon: PieChart, label: '复盘', color: MACARON_COLORS.themes.review },
    { id: 'plan', icon: Calendar, label: '规划', color: MACARON_COLORS.themes.plan },
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

  return (
    <div className="iphone-container bg-white overflow-hidden mx-auto">
      <div className="flex-1 h-full relative">
        <div className="h-[calc(100%-80px)]">
          {renderView()}
        </div>
        
        {/* 底部导航栏 */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-md border-t border-gray-100">
          <div className="flex h-full items-center justify-around px-4">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 ${isActive ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                  style={{ color: isActive ? tab.color : '#8A8A8A' }}
                >
                  <Icon size={20} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold mt-1">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}