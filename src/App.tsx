import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Wifi, Battery, Signal, 
  Timer, BookHeart, PieChart, Calendar, Settings2, 
  CloudSun, Check, Smartphone, MessageSquare, 
  ChevronRight, ArrowRight, Minus, Plus,
  Briefcase, Coffee, Moon, Gamepad2, Heart, Music, Sun,
  PlusCircle, Trash2, MoreVertical, Play, Pause, Maximize2, Minimize2,
  X, Clock, Hourglass, Zap, AlertCircle, 
  Image as ImageIcon, Smile, Frown, Meh, Search, Share2, Camera, PenTool, Hash,
  Trophy, Flame, BarChart3, LineChart, Archive, Bell, Link as LinkIcon, PartyPopper,
  Sparkles, Brain, ListTodo, Utensils, Bath, ArrowUp, ArrowDown, PlayCircle, CheckCircle2, Copy, Star, Send,
  User, LogOut, RefreshCw, Layers, Download, ShieldAlert, Ghost,
  Layout, Sliders, RotateCw, CalendarDays, Edit3, Save, XCircle, ChevronLeft, Droplets
} from 'lucide-react';

// 配置常量
const MACARON_COLORS = {
  bg: '#FFFDF7',
  categories: {
    uncategorized: { primary: '#9CA3AF', light: '#F3F4F6', text: '#4B5563' },
    work: { primary: '#FF8CA1', light: '#FFF0F3', text: '#D9455F' },
    study: { primary: '#FFD23F', light: '#FFFBE6', text: '#B88E00' },
    rest: { primary: '#42D4A4', light: '#E0F9F1', text: '#1B8C69' },
    sleep: { primary: '#6CB6FF', light: '#EAF4FF', text: '#2B73B8' },
    life: { primary: '#B589F6', light: '#F4EBFF', text: '#7E4CCB' },
    entertainment: { primary: '#FF9F1C', light: '#FFF2DB', text: '#B86B00' },
    health: { primary: '#2EC4B6', light: '#DDFBF8', text: '#15877B' },
    hobby: { primary: '#FFBCB5', light: '#FFF5F4', text: '#D66D63' },
  },
  ui: {
    primary: '#FF8CA1', 
    textPrimary: '#2D2D2D',
    textSecondary: '#8A8A8A',
    white: '#FFFFFF'
  },
  themes: {
    timer: '#6CB6FF',
    journal: '#FF85A1',
    review: '#B589F6',
    plan: '#42D4A4',
    settings: '#FFD23F',
  },
  moods: {
    happy: '#FFD23F',
    calm: '#42D4A4',
    sad: '#6CB6FF',
    angry: '#FF8CA1',
    tired: '#E5E5E5',
  }
};

// 状态栏组件
const StatusBar = ({ mode = 'dark' }) => (
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
const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '', style = {} }) => {
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

// 登录界面
const LoginView = ({ onLogin }) => (
  <div className="flex flex-col h-full justify-center items-center px-6 bg-gradient-to-br from-pink-50 to-blue-50">
    <div className="text-center mb-10">
      <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-blue-400 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-2xl">
        <Heart size={32} className="text-white" />
      </div>
      <h1 className="text-3xl font-black text-gray-800 mb-2">治愈时光</h1>
      <p className="text-gray-500 text-base">温柔的时间管理伙伴</p>
    </div>
    
    <div className="w-full max-w-xs space-y-4">
      <Button onClick={onLogin}>
        开始使用
      </Button>
      <p className="text-[10px] text-gray-400 text-center px-4">
        点击开始即表示同意用户协议和隐私政策
      </p>
    </div>
  </div>
);

// 计时器视图
const TimerView = () => {
  const [selectedCategory, setSelectedCategory] = useState('work');
  const categories = [
    { id: 'work', label: '工作', icon: '💼' },
    { id: 'study', label: '学习', icon: '📚' },
    { id: 'rest', label: '休息', icon: '☕' },
    { id: 'life', label: '生活', icon: '🌞' },
  ];

  const theme = MACARON_COLORS.categories[selectedCategory] || MACARON_COLORS.categories.work;

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
  const [appState, setAppState] = useState('login');
  const [activeTab, setActiveTab] = useState('timer');

  const handleLogin = () => {
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

  const tabs = [
    { id: 'timer', icon: Timer, label: '专注', color: MACARON_COLORS.themes.timer },
    { id: 'journal', icon: BookHeart, label: '日记', color: MACARON_COLORS.themes.journal },
    { id: 'review', icon: PieChart, label: '复盘', color: MACARON_COLORS.themes.review },
    { id: 'plan', icon: Calendar, label: '规划', color: MACARON_COLORS.themes.plan },
    { id: 'settings', icon: Settings2, label: '设置', color: MACARON_COLORS.themes.settings },
  ];

  // 手机模拟器容器
  const PhoneContainer = ({ children }) => (
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