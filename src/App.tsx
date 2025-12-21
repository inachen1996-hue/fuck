import { useState, useEffect } from 'react';
import { 
  Wifi, Battery, Signal, 
  Timer, BookHeart, PieChart, Calendar, Settings2, 
  Plus, Heart, Play, Clock, BarChart3, Smartphone, ChevronRight,
  ArrowRight, Sparkles, Target, Coffee, Zap
} from 'lucide-react';

// 类型定义
type CategoryId = 'work' | 'study' | 'rest' | 'life';
type TabId = 'timer' | 'journal' | 'review' | 'plan' | 'settings';

interface CategoryTheme {
  primary: string;
  light: string;
  text: string;
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

// 状态栏组件
const StatusBar = ({ mode = 'dark' }: { mode?: 'dark' | 'light' }) => (
  <div className={`w-full h-[47px] px-7 flex justify-between items-end pb-2 z-50 select-none ${mode === 'light' ? 'text-white' : 'text-[#2D2D2D]'}`}>
    <div className="text-[15px] font-semibold tracking-wide pl-2">9:41</div>
    <div className="flex items-center gap-1.5 pr-1">
      <Signal size={16} strokeWidth={2.5} />
      <Wifi size={16} strokeWidth={2.5} />
      <Battery size={22} strokeWidth={2.5} />
    </div>
  </div>
);

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
                  className="w-full h-14 pl-24 pr-4 bg-white rounded-2xl border-2 border-gray-100 focus:border-pink-300 outline-none text-gray-800 font-bold transition-all"
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
const TimerView = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('work');
  const categories: { id: CategoryId; label: string; icon: string }[] = [
    { id: 'work', label: '工作', icon: '💼' },
    { id: 'study', label: '学习', icon: '📚' },
    { id: 'rest', label: '休息', icon: '☕' },
    { id: 'life', label: '生活', icon: '🌞' },
  ];

  const theme = MACARON_COLORS.categories[selectedCategory];

  return (
    <div className="flex h-full" style={{ backgroundColor: MACARON_COLORS.bg }}>
      {/* 侧边栏 */}
      <div className="w-[70px] h-full flex flex-col items-center py-6 border-r border-[#F0F0F0] bg-white/50 backdrop-blur-sm">
        <div className="space-y-2 w-full flex flex-col items-center px-1">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            const catTheme = MACARON_COLORS.categories[cat.id];
            return (
              <button 
                key={cat.id} 
                onClick={() => setSelectedCategory(cat.id)}
                className={`relative w-full py-3 rounded-xl flex items-center justify-center transition-all duration-300 ${isSelected ? 'shadow-md scale-105' : 'hover:bg-white/80 hover:scale-105'}`}
                style={{ backgroundColor: isSelected ? catTheme.primary : 'transparent' }}
              >
                <span className={`text-[10px] font-black ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                  {cat.label}
                </span>
              </button>
            );
          })}
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
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl hover:brightness-110 active:scale-90 transition-all"
            style={{ backgroundColor: theme.primary, boxShadow: `0 10px 20px -5px ${theme.primary}66` }}
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center px-6">
          <div className="w-full max-w-sm">
            <div 
              className="relative w-full h-[350px] rounded-[32px] p-6 shadow-2xl bg-white border-3"
              style={{ borderColor: theme.primary }}
            >
              <div className="flex flex-col h-full justify-between items-center">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <Clock size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-[#2D2D2D]">专注时间</h4>
                    <p className="text-xs text-gray-400">准备开始专注</p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-5xl font-semibold font-mono text-[#2D2D2D] mb-3">
                    25:00
                  </div>
                  <p className="text-[#2D2D2D] opacity-60 font-medium text-sm px-4">
                    全神贯注，此刻即是永恒。
                  </p>
                </div>

                <button 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all hover:brightness-110"
                  style={{ backgroundColor: theme.primary, boxShadow: `0 10px 20px -5px ${theme.primary}66` }}
                >
                  <Play fill="white" size={28} className="ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 日记视图
const JournalView = () => (
  <div className="flex flex-col h-full bg-[#FFFDF7] p-6">
    <div className="text-center mb-6">
      <h2 className="text-2xl font-black text-[#2D2D2D] mb-2">心情日记</h2>
      <p className="text-[10px] font-bold text-[#FF85A1] uppercase tracking-wider">MOMENTS & THOUGHTS</p>
    </div>
    
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center opacity-60">
        <div className="w-24 h-24 rounded-full mb-4 flex items-center justify-center bg-pink-100">
          <BookHeart size={40} className="text-pink-400" />
        </div>
        <p className="text-[#2D2D2D] font-bold text-lg">记录美好时光</p>
        <p className="text-[#8A8A8A] text-sm mt-2 px-4">点击开始写下今天的心情</p>
      </div>
    </div>
  </div>
);

// 复盘视图
const ReviewView = () => (
  <div className="flex flex-col h-full bg-[#FFFDF7] p-6">
    <div className="text-center mb-6">
      <h2 className="text-2xl font-black text-[#2D2D2D] mb-2">今日复盘</h2>
      <p className="text-[10px] font-bold text-[#B589F6] uppercase tracking-wider">DAILY REVIEW</p>
    </div>
    
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center opacity-60">
        <div className="w-24 h-24 rounded-full mb-4 flex items-center justify-center bg-purple-100">
          <BarChart3 size={40} className="text-purple-400" />
        </div>
        <p className="text-[#2D2D2D] font-bold text-lg">回顾今天的收获</p>
        <p className="text-[#8A8A8A] text-sm mt-2 px-4">AI 将帮你生成专属复盘报告</p>
      </div>
    </div>
  </div>
);

// 计划视图
const PlanView = () => (
  <div className="flex flex-col h-full bg-[#FFFDF7] p-6">
    <div className="text-center mb-6">
      <h2 className="text-2xl font-black text-[#2D2D2D] mb-2">智能规划</h2>
      <p className="text-[10px] font-bold text-[#42D4A4] uppercase tracking-wider">AI PLANNING</p>
    </div>
    
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center opacity-60">
        <div className="w-24 h-24 rounded-full mb-4 flex items-center justify-center bg-green-100">
          <Calendar size={40} className="text-green-400" />
        </div>
        <p className="text-[#2D2D2D] font-bold text-lg">制定完美计划</p>
        <p className="text-[#8A8A8A] text-sm mt-2 px-4">AI 助手为你安排最佳时间</p>
      </div>
    </div>
  </div>
);

// 设置视图
const SettingsView = () => (
  <div className="flex flex-col h-full bg-[#FFFDF7] p-6">
    <div className="text-center mb-6">
      <h2 className="text-2xl font-black text-[#2D2D2D] mb-2">个人设置</h2>
      <p className="text-[10px] font-bold text-[#FFD23F] uppercase tracking-wider">PREFERENCES</p>
    </div>
    
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center opacity-60">
        <div className="w-24 h-24 rounded-full mb-4 flex items-center justify-center bg-yellow-100">
          <Settings2 size={40} className="text-yellow-400" />
        </div>
        <p className="text-[#2D2D2D] font-bold text-lg">个性化设置</p>
        <p className="text-[#8A8A8A] text-sm mt-2 px-4">调整应用以适合你的习惯</p>
      </div>
    </div>
  </div>
);

// 主应用组件
export default function App() {
  const [appState, setAppState] = useState<'login' | 'onboarding' | 'main'>('login');
  const [activeTab, setActiveTab] = useState<TabId>('timer');
  const [isFirstTime, setIsFirstTime] = useState(true); // 模拟首次使用

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
      case 'timer': return <TimerView />;
      case 'journal': return <JournalView />;
      case 'review': return <ReviewView />;
      case 'plan': return <PlanView />;
      case 'settings': return <SettingsView />;
      default: return <TimerView />;
    }
  };

  const tabs: { id: TabId; icon: typeof Timer; label: string; color: string }[] = [
    { id: 'timer', icon: Timer, label: '专注', color: MACARON_COLORS.themes.timer },
    { id: 'journal', icon: BookHeart, label: '日记', color: MACARON_COLORS.themes.journal },
    { id: 'review', icon: PieChart, label: '复盘', color: MACARON_COLORS.themes.review },
    { id: 'plan', icon: Calendar, label: '规划', color: MACARON_COLORS.themes.plan },
    { id: 'settings', icon: Settings2, label: '设置', color: MACARON_COLORS.themes.settings },
  ];

  // 手机模拟器容器
  const PhoneContainer = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <div className="relative">
        {/* 手机外壳 - 9:16 比例 */}
        <div className="w-[360px] h-[640px] bg-black rounded-[50px] p-2 shadow-2xl">
          {/* 手机屏幕 */}
          <div className="w-full h-full bg-white rounded-[40px] overflow-hidden relative">
            {children}
          </div>
        </div>
        {/* 手机底部指示器 */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-28 h-1 bg-gray-600 rounded-full"></div>
      </div>
    </div>
  );

  if (appState === 'login') {
    return (
      <PhoneContainer>
        <StatusBar />
        <div className="flex-1 h-[calc(100%-47px)]">
          <LoginView onLogin={handleLogin} />
        </div>
      </PhoneContainer>
    );
  }

  if (appState === 'onboarding') {
    return (
      <PhoneContainer>
        <StatusBar />
        <div className="flex-1 h-[calc(100%-47px)]">
          <OnboardingView onComplete={handleOnboardingComplete} />
        </div>
      </PhoneContainer>
    );
  }

  return (
    <PhoneContainer>
      <StatusBar />
      <div className="flex-1 h-[calc(100%-47px)] relative">
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
    </PhoneContainer>
  );
}