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

/* =========================================================================================
   PART 1: 核心逻辑区 (CORE LOGIC)
   [AI DANGER ZONE - DO NOT TOUCH]
   #########################################################################################
   警告：核心状态管理区域
   在此区域编写所有的状态管理、数据处理、AI 调用和副作用。
   严禁随意修改、删除或简化此区域的任何 Hook 逻辑，否则会导致应用崩溃。
   #########################################################################################
   ========================================================================================= */

// --- 1.0 API 配置 (请在此处填入你的 API KEY) ---
const API_CONFIG = {
  // 在这里填入你的 API Key，例如 "sk-xxxxxxxx"
  apiKey: "YOUR_API_KEY_HERE", 
  
  // API 地址，默认为 DeepSeek 或 OpenAI 兼容地址
  baseUrl: "https://api.deepseek.com/chat/completions", 
  
  // 模型名称
  model: "deepseek-chat" 
};

// --- 1.1 全局配置与常量 ---
const IS_PROD = false; 

// [FIX] 重构颜色定义：使用十六进制 Hex 代码，确保内联样式可用
const MACARON_COLORS = {
  bg: '#FFFDF7', // 奶油白背景
  
  // 分类专属色板 (完整映射)
  categories: {
    uncategorized: { primary: '#9CA3AF', light: '#F3F4F6', text: '#4B5563' },
    work:          { primary: '#FF8CA1', light: '#FFF0F3', text: '#D9455F' },
    study:         { primary: '#FFD23F', light: '#FFFBE6', text: '#B88E00' },
    rest:          { primary: '#42D4A4', light: '#E0F9F1', text: '#1B8C69' },
    sleep:         { primary: '#6CB6FF', light: '#EAF4FF', text: '#2B73B8' },
    life:          { primary: '#B589F6', light: '#F4EBFF', text: '#7E4CCB' },
    entertainment: { primary: '#FF9F1C', light: '#FFF2DB', text: '#B86B00' },
    health:        { primary: '#2EC4B6', light: '#DDFBF8', text: '#15877B' },
    hobby:         { primary: '#FFBCB5', light: '#FFF5F4', text: '#D66D63' },
  },

  // [NEW] 新增分类时可选的颜色板 (8种马卡龙色)
  palette: [
    '#FF8CA1', // Pink
    '#FFD23F', // Yellow
    '#42D4A4', // Green
    '#6CB6FF', // Blue
    '#B589F6', // Purple
    '#FF9F1C', // Orange
    '#2EC4B6', // Teal
    '#FFBCB5', // Coral
  ],

  // 基础UI颜色
  ui: {
    primary: '#FF8CA1', 
    textPrimary: '#2D2D2D',
    textSecondary: '#8A8A8A',
    white: '#FFFFFF'
  },

  // 模块主题色 (用于 Tab 栏等)
  themes: {
    timer: '#6CB6FF', // 默认蓝色，会被动态分类色覆盖
    journal: '#FF85A1',
    review: '#B589F6',
    plan: '#42D4A4',
    settings: '#FFD23F',
  },
  
  // 心情颜色
  moods: {
    happy: '#FFD23F',
    calm: '#42D4A4',
    sad: '#6CB6FF',
    angry: '#FF8CA1',
    tired: '#E5E5E5',
  },

  ai: {
    gradient: 'from-[#E0CCFF] to-[#C7CEEA]'
  }
};

const ANIMATIONS = {
  spring: "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
  bounce: "active:scale-95 transition-transform duration-200"
};

// --- 1.2 真实 AI 服务 (Real AI Service) ---
const aiService = {
  // 备用：模拟数据 (当 API 失败时使用)
  _mockPlan: (tasks, now) => {
    return {
       schedule: tasks.map((t, i) => ({
         ...t, 
         start: now + i*3600000, 
         end: now + (i+1)*3600000, 
         isPomodoro: true,
         type: 'pomodoro'
       })),
       bedtimeMs: now + 8 * 3600000
    };
  },

  generateReview: async (period) => new Promise(resolve => setTimeout(() => resolve({ 
    summary: `📅 **${period}总结**\n你今天在工作上投入了大量时间，效率很高！`, 
    advice: `💡 **AI 建议**\n注意劳逸结合，明天可以适当增加休息时间。` 
  }), 1500)),
  
  // [UPGRADED] 真实接入层逻辑
  generatePlan: async (tasks, bedtimeStr, lifestyle, mentalStatus, psychStatus) => {
    const now = Date.now();
    
    // 如果没有配置 Key，直接返回模拟数据，不报错
    if (!API_CONFIG.apiKey || API_CONFIG.apiKey === "YOUR_API_KEY_HERE") {
       console.warn("⚠️ 未检测到 API Key，使用模拟数据生成计划");
       return new Promise(resolve => setTimeout(() => resolve(aiService._mockPlan(tasks, now)), 1500));
    }

    try {
      // 1. 构建 Prompt (提示词)
      const currentTimeStr = new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'});
      
      const systemPrompt = `
        你是一位温柔的“治愈系时间管理专家”。
        你的任务是根据用户的当前状态、生活习惯和待办事项，为用户规划从现在(${currentTimeStr})到睡觉时间(${bedtimeStr})的详细日程表。
        
        请遵循以下原则：
        1. **优先级**：先安排用户必须做的待办事项(Tasks)。
        2. **生活关怀**：检查lifestyle参数。如果用户还没吃饭(breakfast/lunch/dinner为false)且当前时间合适，必须安排吃饭时间。如果没洗漱(morningWash/nightWash)，请在合适时间安排。
        3. **状态适应**：
           - 如果 mentalStatus (精神) 是 'tired' (疲惫)，请在任务间多安排 'rest' (休息) 或 'meditation' (冥想)。
           - 如果 psychStatus (心理) 是 'anxious' (焦虑)，请把任务切分得更细，或者安排一段“放空时间”。
           - 如果状态 'energetic' (充沛)，可以安排紧凑的专注时段。
        4. **填补空缺**：待办事项安排完后，如果有空余时间，根据治愈风格推荐一些活动（如：阅读、听音乐、散步、整理）。

        输出格式必须为严格的 JSON，不包含 Markdown 格式，结构如下：
        {
          "schedule": [
            { "name": "事项名称", "start": timestamp(毫秒), "end": timestamp(毫秒), "type": "pomodoro" | "rest" | "life" | "entertainment", "icon": "emoji" }
          ],
          "bedtimeMs": timestamp(毫秒)
        }
      `;

      const userPayload = {
        currentTime: now,
        bedtimeTarget: bedtimeStr,
        tasks: tasks.map(t => ({ name: t.name, durationMin: t.duration })),
        lifestyleState: lifestyle, // { breakfast: false, ... }
        status: { mental: mentalStatus, psych: psychStatus }
      };

      // 2. 发起请求
      const response = await fetch(API_CONFIG.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: API_CONFIG.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify(userPayload) }
          ],
          response_format: { type: "json_object" }, // 强制 JSON 模式 (如果模型支持)
          temperature: 0.7
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // 3. 解析结果
      // 有些模型可能返回 ```json ... ```，需要清理
      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJson);

      return result;

    } catch (error) {
      console.error("AI 生成计划失败，降级为模拟数据:", error);
      // 降级处理，保证 App 不白屏
      return aiService._mockPlan(tasks, now);
    }
  }
};

// --- 1.3 自定义 Hooks ---
const useTimerSystem = () => {
  const defaultCategories = [
    { id: 'uncategorized', label: '待分类', icon: '📂' },
    { id: 'work', label: '工作', icon: '💼' },
    { id: 'study', label: '学习', icon: '📚' },
    { id: 'life', label: '生活', icon: '🌞' },
    { id: 'rest', label: '休息', icon: '☕' },
  ];
  const [categories, setCategories] = useState(defaultCategories);
  const [timers, setTimers] = useState([]);
  const [activeTimerId, setActiveTimerId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (activeTimerId) {
      timerRef.current = setInterval(() => {
        setTimers(p => p.map(t => {
          if (t.id === activeTimerId && t.status === 'running') {
             // 简单的倒计时/番茄钟逻辑
             if ((t.type === 'pomodoro' || t.type === 'countdown')) {
                const totalDuration = t.duration || 0; 
                if (t.elapsed >= totalDuration) {
                    return { ...t, status: 'completed', elapsed: totalDuration };
                }
             }
             return { ...t, elapsed: (t.elapsed || 0) + 1 };
          }
          return t;
        }));
      }, 1000);
    } else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [activeTimerId]);

  // [MODIFIED] addCategory now accepts an object { name, color }
  const addCategory = ({ name, color }) => {
      setCategories([...categories, { 
          id: Date.now().toString(), 
          label: name, 
          icon: '✨',
          color: color // Store custom color
      }]);
  };
  
  const deleteCategory = (id) => {
    if(id === 'uncategorized') return;
    setTimers(prev => prev.map(t => t.categoryId === id ? { ...t, categoryId: 'uncategorized' } : t));
    setCategories(prev => prev.filter(c => c.id !== id));
    setToastMsg("分类已删除");
  };

  // [MODIFIED] CreateTimer 增强：支持更多配置
  const createTimer = (data) => {
    const id = Date.now().toString();
    const newTimer = {
      ...data, 
      id, 
      status: 'idle', 
      elapsed: 0, 
      createdAt: Date.now(),
      // 默认配置 (如果不传则使用默认)
      config: data.config || { work: 25, break: 5, loops: 1 }
    };
    setTimers(p => [newTimer, ...p]);
    return id;
  };

  // [MODIFIED] StartTimer 增强：支持启动时传入临时配置
  const startTimer = (id, runtimeConfig = null) => {
    if (activeTimerId && activeTimerId !== id) pauseTimer(activeTimerId);
    
    setTimers(p => p.map(t => {
        if (t.id === id) {
            // 如果传入了新的运行时配置（例如改变了模式或时长），则更新它
            const updates = runtimeConfig ? {
                ...runtimeConfig, // 覆盖 duration, type 等
                elapsed: 0,       // 重置进度
            } : {};
            
            return {
                ...t, 
                ...updates,
                status: 'running', 
                lastStartTime: Date.now()
            };
        }
        return t;
    }));
    setActiveTimerId(id);
  };

  const pauseTimer = (id) => {
    setTimers(p => p.map(t => t.id === id ? {...t, status: 'paused'} : t));
    setActiveTimerId(null);
  };
  
  const deleteTimer = (id) => {
    if(activeTimerId === id) setActiveTimerId(null);
    setTimers(p => p.filter(t => t.id !== id));
  };

  return { categories, timers, activeTimerId, toastMsg, setToastMsg, addCategory, deleteCategory, createTimer, startTimer, pauseTimer, deleteTimer, setTimers };
};

const useHabitSystem = () => {
  const [habits, setHabits] = useState([{ id: 'h1', name: '晨间喝水', frequency: 'daily', completedDates: [], categoryId: 'health', isArchived: false }]);
  const addHabit = (h) => setHabits([...habits, { id: Date.now().toString(), completedDates: [], isArchived: false, ...h }]);
  const toggleCheckIn = (id) => {
    const today = new Date().toDateString();
    setHabits(prev => prev.map(h => h.id === id ? { ...h, completedDates: h.completedDates.includes(today) ? h.completedDates.filter(d => d !== today) : [...h.completedDates, today] } : h));
  };
  const archiveHabit = (id) => setHabits(p => p.map(h => h.id === id ? {...h, isArchived: true} : h));
  return { habits, addHabit, toggleCheckIn, archiveHabit };
};

// [MODIFIED] Journal System 升级：支持编辑、删除、图片、草稿
const useJournalSystem = () => {
  const [journals, setJournals] = useState([]);
  const [draft, setDraft] = useState(null); // 自动保存草稿

  const addJournal = (entry) => {
    setJournals([{ 
      id: Date.now().toString(), 
      date: Date.now(), 
      images: [], // 默认空图片
      bodySensation: [], // 身体感受
      uncompletedReasons: {}, // 未完成任务原因
      ...entry 
    }, ...journals]);
    setDraft(null); // 清空草稿
  };

  const updateJournal = (id, updates) => {
    setJournals(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  const deleteJournal = (id) => {
    setJournals(prev => prev.filter(j => j.id !== id));
  };

  const saveDraft = (entry) => {
    setDraft(entry);
  };

  return { journals, draft, addJournal, updateJournal, deleteJournal, saveDraft };
};

const useSettingsSystem = () => {
  const [user, setUser] = useState({ id: 'u001', name: '治愈体验官', avatar: '🐱' });
  const [aiConfig, setAiConfig] = useState({ model: 'deepseek', models: [{id:'deepseek', name:'DeepSeek', icon:'🐳'}, {id:'gemini', name:'Gemini', icon:'✨'}] });
  // [MODIFIED] Added longBreakDuration and longBreakInterval to config
  const [pomodoroConfig, setPomodoroConfig] = useState({ 
      workDuration: 25, 
      shortBreak: 5,
      longBreakDuration: 15,
      longBreakInterval: 4 
  });
  return { user, aiConfig, setAiConfig, pomodoroConfig, setPomodoroConfig };
};

const useDataSystem = () => {
  const [syncStatus, setSyncStatus] = useState('idle');
  const syncToCloud = () => { setSyncStatus('syncing'); setTimeout(() => setSyncStatus('idle'), 1000); };
  return { syncStatus, setSyncStatus, syncToCloud };
};

const useLoginLogic = (onLoginSuccess) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const startCountdown = () => { setCountdown(60); const t = setInterval(() => setCountdown(p => { if(p<=1) clearInterval(t); return p-1; }), 1000); };
  const handleLogin = () => { if(agreed || !IS_PROD) onLoginSuccess(); };
  
  // [MODIFIED] 新增 bypassLogin 用于开发者模式
  const bypassLogin = () => onLoginSuccess();

  return { phone, setPhone, code, setCode, agreed, setAgreed, countdown, startCountdown, handleLogin, bypassLogin };
};

const useReviewLogic = () => {
  const [aiReport, setAiReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const generateReport = async () => { setLoading(true); const d = await aiService.generateReview('今日'); setAiReport(d); setLoading(false); };
  return { aiReport, loading, generateReport };
};

const usePlanLogic = (timerSystem) => {
  const [step, setStep] = useState(1);
  const [tasks, setTasks] = useState([]);
  const [scheduleData, setScheduleData] = useState(null);
  const [generating, setGenerating] = useState(false);
  
  // [FIX] addTask function was missing 'duration' parameter usage if passed, though here only name is used mostly.
  // Adding flexible support.
  const addTask = (name, duration = 25) => { 
      if(name) setTasks([...tasks, {id:Date.now().toString(), name, duration}]); 
  };

  // [MODIFIED] generate function accepts more context
  const generate = async (bedtime, lifestyle, mentalStatus, psychStatus) => { 
      setGenerating(true); 
      // Call Real AI Service
      const d = await aiService.generatePlan(tasks, bedtime, lifestyle, mentalStatus, psychStatus); 
      setScheduleData(d); 
      setGenerating(false); 
      setStep(2); 
  };

  const playTask = (t) => { const id = timerSystem.createTimer({name:t.name, duration:(t.duration || 25)*60, type: t.type === 'pomodoro' ? 'pomodoro' : 'stopwatch', icon: t.icon || '📅'}); timerSystem.startTimer(id); };
  return { step, setStep, tasks, addTask, scheduleData, generating, generate, playTask };
};


/* =========================================================================================
   PART 2: UI 视觉区 (UI COMPONENTS)
   -----------------------------------------------------------------------------------------
   ========================================================================================= */

// [HELPER] 安全获取分类颜色 (Modified to support custom colors)
const getCategoryTheme = (category) => {
    // If category is a string ID (old logic)
    if (typeof category === 'string') {
        return MACARON_COLORS.categories[category] || MACARON_COLORS.categories.uncategorized;
    }
    // If category is an object (new logic from TimerView)
    if (category && category.color) {
        return { primary: category.color, light: category.color + '20', text: category.color }; 
    }
    // Fallback if category object matches a preset ID
    if (category && MACARON_COLORS.categories[category.id]) {
        return MACARON_COLORS.categories[category.id];
    }
    return MACARON_COLORS.categories.uncategorized;
};

// [HELPER] 安全获取计时器图标
const getTimerIcon = (type) => {
  switch (type) {
    case 'stopwatch': return Zap;
    case 'pomodoro': return Clock;
    case 'countdown': return Hourglass;
    default: return Clock;
  }
};

// --- 原子组件 ---

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

const Toast = ({ message, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, []);
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md text-[#2D2D2D] px-5 py-2.5 rounded-full text-xs font-bold shadow-xl z-[100] animate-fade-in-down flex items-center gap-2 whitespace-nowrap border-2 border-[#FF8CA1]">
      <AlertCircle size={14} className="text-[#FF8CA1]" /> {message}
    </div>
  );
};

const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '', style = {} }) => {
  const baseStyle = `w-full h-12 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 ${ANIMATIONS.bounce} disabled:opacity-50 disabled:scale-100 disabled:shadow-none transition-all duration-300`;
  const variants = {
    primary: `text-white shadow-[0_8px_0_0_#FF5C7C] hover:shadow-[0_6px_0_0_#FF5C7C] hover:translate-y-[2px] active:shadow-none active:translate-y-[8px]`,
    outline: `border-2 border-[#FF8CA1] text-[#FF8CA1] bg-white hover:bg-[#FFF0F5]`,
    ghost: `bg-transparent text-[#8A8A8A] text-sm font-medium h-auto py-2 hover:bg-[#F0F0F0] rounded-lg`,
    danger: `bg-[#FF8CA1] text-white shadow-md`,
    ai: `bg-gradient-to-r ${MACARON_COLORS.ai.gradient} text-[#9D7AD8] shadow-[0_8px_20px_-5px_rgba(157,122,216,0.4)]`
  };
  
  const computedStyle = variant === 'primary' ? { backgroundColor: MACARON_COLORS.ui.primary, ...style } : style;

  return <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`} style={computedStyle}>{children}</button>;
};

// --- [NEW] FocusSettingsModal (番茄钟设置弹窗) ---
const FocusSettingsModal = ({ config, onClose, onSave }) => {
    const [localConfig, setLocalConfig] = useState(config);
    const themeColor = MACARON_COLORS.themes.settings; // Yellow for settings

    const handleSave = () => {
        onSave(localConfig);
        onClose();
    };

    return (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-[80] flex items-center justify-center animate-fade-in">
            <div className="bg-white w-[85%] rounded-[32px] p-8 shadow-2xl animate-scale-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-[#2D2D2D]">专注设置</h3>
                    <button onClick={onClose}><X size={24} className="text-gray-300 hover:text-[#2D2D2D]" /></button>
                </div>

                <div className="space-y-8">
                    {/* 工作时长 */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-bold text-[#2D2D2D]">工作时长</span>
                            <span className="text-sm font-bold text-[#FFD23F]">{localConfig.workDuration} min</span>
                        </div>
                        <input 
                            type="range" min="5" max="120" step="5"
                            value={localConfig.workDuration} 
                            onChange={e => setLocalConfig({...localConfig, workDuration: Number(e.target.value)})} 
                            className="w-full h-2 bg-[#FFF2DB] rounded-full appearance-none cursor-pointer accent-[#FFD23F]"
                        />
                    </div>

                    {/* 休息时长 */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-bold text-[#2D2D2D]">休息时长</span>
                            <span className="text-sm font-bold text-[#FFD23F]">{localConfig.shortBreak} min</span>
                        </div>
                        <input 
                            type="range" min="1" max="30" step="1"
                            value={localConfig.shortBreak} 
                            onChange={e => setLocalConfig({...localConfig, shortBreak: Number(e.target.value)})} 
                            className="w-full h-2 bg-[#FFF2DB] rounded-full appearance-none cursor-pointer accent-[#FFD23F]"
                        />
                    </div>

                    {/* 长休息时长 */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-bold text-[#2D2D2D]">长休息时长</span>
                            <span className="text-sm font-bold text-[#FFD23F]">{localConfig.longBreakDuration} min</span>
                        </div>
                        <input 
                            type="range" min="1" max="30" step="1"
                            value={localConfig.longBreakDuration} 
                            onChange={e => setLocalConfig({...localConfig, longBreakDuration: Number(e.target.value)})} 
                            className="w-full h-2 bg-[#FFF2DB] rounded-full appearance-none cursor-pointer accent-[#FFD23F]"
                        />
                    </div>

                    {/* 长休息周期 */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-bold text-[#2D2D2D]">长休息周期</span>
                            <span className="text-sm font-bold text-[#FFD23F]">{localConfig.longBreakInterval} 轮</span>
                        </div>
                        <input 
                            type="range" min="1" max="10" step="1"
                            value={localConfig.longBreakInterval} 
                            onChange={e => setLocalConfig({...localConfig, longBreakInterval: Number(e.target.value)})} 
                            className="w-full h-2 bg-[#FFF2DB] rounded-full appearance-none cursor-pointer accent-[#FFD23F]"
                        />
                    </div>

                    <Button onClick={handleSave} style={{ backgroundColor: themeColor }}>保存设置</Button>
                </div>
            </div>
        </div>
    );
};

// --- AddCategoryModal (新增分类弹窗) ---
const AddCategoryModal = ({ onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(MACARON_COLORS.palette[0]);

  const handleSubmit = () => {
    if (!name) return;
    onConfirm({ name, color: selectedColor });
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-[80] flex items-center justify-center animate-fade-in">
      <div className="bg-white w-[85%] rounded-[32px] p-8 shadow-2xl animate-scale-in">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-[#2D2D2D]">新建分类</h3>
            <button onClick={onClose}><X size={24} className="text-gray-300 hover:text-[#2D2D2D]" /></button>
         </div>
         
         <div className="space-y-6">
           <div>
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">分类名称</label>
             <input 
                 value={name}
                 onChange={e => setName(e.target.value)}
                 placeholder="例如：健身、阅读..."
                 className="w-full bg-[#F9FAFB] border-2 border-transparent focus:bg-white p-3 rounded-xl outline-none font-bold text-[#2D2D2D] focus:border-[#FF8CA1] transition-all"
                 autoFocus
             />
           </div>

           <div>
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">选择颜色</label>
             <div className="grid grid-cols-4 gap-3">
                 {MACARON_COLORS.palette.map(color => (
                   <button
                     key={color}
                     onClick={() => setSelectedColor(color)}
                     className={`w-12 h-12 rounded-full transition-all duration-300 flex items-center justify-center ${selectedColor === color ? 'scale-110 shadow-lg ring-4 ring-offset-2 ring-gray-100' : 'hover:scale-105'}`}
                     style={{ backgroundColor: color }}
                   >
                     {selectedColor === color && <Check size={20} className="text-white drop-shadow-md" strokeWidth={3} />}
                   </button>
                 ))}
             </div>
           </div>

           <Button onClick={handleSubmit} disabled={!name} className="w-full" style={{ backgroundColor: selectedColor }}>
             创建分类
           </Button>
         </div>
      </div>
    </div>
  );
};

// --- Custom Macaron Date Picker Modal ---
const CustomDatePickerModal = ({ currentDate, onClose, onSelect }) => {
  const [displayDate, setDisplayDate] = useState(new Date(currentDate || Date.now()));
  
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

  const handlePrevMonth = () => setDisplayDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setDisplayDate(new Date(year, month + 1, 1));

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="bg-white w-[85%] rounded-[32px] p-6 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100 text-gray-400"><ChevronLeft size={20}/></button>
          <span className="text-lg font-black text-[#2D2D2D]">{year}年 {month + 1}月</span>
          <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100 text-gray-400"><ChevronRight size={20}/></button>
        </div>
        <div className="grid grid-cols-7 mb-2 text-center">
           {['日','一','二','三','四','五','六'].map(d => (<div key={d} className="text-xs font-bold text-gray-300 pb-2">{d}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-y-2 gap-x-1">
           {days.map((d, i) => {
             if (!d) return <div key={`empty-${i}`} />;
             const isSelected = currentDate && new Date(currentDate).toDateString() === d.toDateString();
             const isToday = new Date().toDateString() === d.toDateString();
             return (
               <button key={i} onClick={() => { onSelect(d.toISOString()); onClose(); }} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mx-auto transition-all ${isSelected ? 'bg-[#FF85A1] text-white shadow-md scale-110' : ''} ${!isSelected && isToday ? 'text-[#FF85A1] border border-[#FF85A1]' : ''} ${!isSelected && !isToday ? 'text-[#2D2D2D] hover:bg-gray-100' : ''}`}>
                 {d.getDate()}
               </button>
             );
           })}
        </div>
        <div className="mt-6 flex justify-center"><button onClick={() => { onSelect(null); onClose(); }} className="text-xs font-bold text-gray-400 hover:text-[#FF85A1]">清除筛选</button></div>
      </div>
    </div>
  );
};

// --- TimerView and Modals (KEEP AS IS) ---
const StartTimerSetupModal = ({ timer, onClose, onStart }) => {
  const [mode, setMode] = useState('pomodoro');
  const [duration, setDuration] = useState(25);
  const theme = getCategoryTheme(timer.categoryId);
  const handleStart = () => {
    let startConfig = { type: mode, duration: mode === 'stopwatch' ? 0 : duration * 60 };
    onStart(startConfig);
  };
  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-[70] flex items-end sm:items-center justify-center animate-fade-in">
      <div className="bg-white w-full sm:w-[90%] rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-slide-up border-t-8" style={{ borderColor: theme.primary }}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-[#2D2D2D]">开始 "{timer.name}"</h3>
          <button onClick={onClose}><X size={28} className="text-gray-300 hover:text-[#2D2D2D]" /></button>
        </div>
        <div className="space-y-8">
           <div><label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">选择模式</label><div className="grid grid-cols-3 gap-3">{[ {id:'pomodoro', l:'番茄钟', i:Clock}, {id:'countdown', l:'倒计时', i:Hourglass}, {id:'stopwatch', l:'正计时', i:Zap} ].map(m => (<button key={m.id} onClick={() => setMode(m.id)} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${mode === m.id ? 'bg-white shadow-md -translate-y-1' : 'bg-[#F9FAFB] border-transparent text-gray-400'}`} style={{ borderColor: mode === m.id ? theme.primary : 'transparent', color: mode === m.id ? theme.primary : undefined }}><m.i size={24} className="mb-2" /><span className="text-xs font-black">{m.l}</span></button>))}</div></div>
           {mode !== 'stopwatch' && (<div className="bg-[#F9FAFB] p-5 rounded-2xl border-2 border-transparent hover:border-gray-100 transition-colors"><div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{mode === 'pomodoro' ? '专注时长' : '倒计时时长'}</span><span className="text-xl font-black" style={{ color: theme.primary }}>{duration} min</span></div><input type="range" min="1" max="120" step="1" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-current" style={{ color: theme.primary }} /></div>)}
           <Button onClick={handleStart} className="w-full !text-white !shadow-lg hover:!brightness-110 active:!scale-95" style={{ backgroundColor: theme.primary, boxShadow: `0 10px 20px -5px ${theme.primary}66` }}>立即开始</Button>
        </div>
      </div>
    </div>
  );
};

const CreateTimerModal = ({ categoryId, categories, onClose, onCreate, onStartImmediate }) => {
  const [step, setStep] = useState(1);
  const [newTimerId, setNewTimerId] = useState(null);
  const [icon, setIcon] = useState('⏰');
  const [name, setName] = useState('');
  const [selectedCat, setSelectedCat] = useState(categoryId);
  const [config, setConfig] = useState({ work: 25, break: 5, loops: 1 });
  const EMOJI_GRID = ['⏰','⚡','📚','🏃','💤','🍳','💻','🧘','🎨','🎵','🎮','🚲','📝','💡','💼','🌈','🍎','☕','🐶','🐱'];
  const theme = getCategoryTheme(selectedCat);
  const emojiInputRef = useRef(null);

  useEffect(() => { if (!name) { const cat = categories.find(c => c.id === selectedCat); if(cat) setName(''); } }, [selectedCat]);
  
  const handleCreate = () => {
    if(!name) return;
    const tId = onCreate({ name, categoryId: selectedCat, icon, type: 'pomodoro', duration: 25 * 60, config: { work: 25, break: 5, loops: 1 } });
    setNewTimerId(tId); setStep(2);
  };
  const handleEmojiClick = () => { if(emojiInputRef.current) emojiInputRef.current.focus(); };
  const handleEmojiChange = (e) => { const val = e.target.value; if (val) { const lastChar = [...val].pop(); if(lastChar) setIcon(lastChar); e.target.value = ''; } };

  if (step === 2) {
    return (
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-[60] flex items-center justify-center animate-fade-in">
        <div className="bg-white w-[85%] rounded-[32px] p-8 text-center shadow-2xl animate-bounce-small">
           <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl shadow-inner bg-[#F9FAFB]">{icon}</div><h3 className="text-2xl font-black text-[#2D2D2D] mb-2">"{name}" 已创建</h3><p className="text-gray-400 text-sm mb-8">是否立即开始这个计时器？</p>
           <div className="space-y-3"><Button onClick={() => { onStartImmediate(newTimerId); onClose(); }} style={{ backgroundColor: theme.primary }}>现在开始</Button><Button variant="ghost" onClick={onClose}>稍后再说</Button></div>
        </div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-[60] flex items-end sm:items-center justify-center animate-fade-in">
      <div className="bg-white w-full sm:w-[90%] rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-slide-up border-t-8 h-[85vh] overflow-y-auto" style={{ borderColor: theme.primary }}>
        <div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-black text-[#2D2D2D]">新建专注项</h3><button onClick={onClose}><X size={28} className="text-gray-300 hover:text-[#2D2D2D]" /></button></div>
        <div className="space-y-8">
          <div className="space-y-4">
              <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none"><PenTool size={18} style={{ color: theme.primary }} /></div>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="先给计时器起个名字吧～" className="w-full bg-[#F9FAFB] border-2 border-transparent focus:bg-white p-4 pl-12 rounded-2xl outline-none text-[#2D2D2D] font-bold text-lg transition-all placeholder:text-gray-300 placeholder:font-normal" style={{ caretColor: theme.primary }} onFocus={(e) => e.target.style.borderColor = theme.primary} onBlur={(e) => e.target.style.borderColor = 'transparent'} autoFocus />
              </div>
              <div className="flex flex-wrap gap-2">{categories.map(c => { const cTheme = getCategoryTheme(c); return (<button key={c.id} onClick={() => setSelectedCat(c.id)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedCat === c.id ? 'text-white shadow-md' : 'bg-[#F9FAFB] text-gray-400 hover:bg-gray-100'}`} style={{ backgroundColor: selectedCat === c.id ? cTheme.primary : undefined }}>{c.label}</button>); })}</div>
          </div>
          {/* [FIXED] Emoji Picker Interaction Logic */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">选择图标</label>
            <div className="relative w-20 h-20 mx-auto">
              {/* Button receives the click because input has pointer-events-none */}
              <button onClick={handleEmojiClick} className="w-full h-full rounded-[24px] bg-[#F9FAFB] border-2 border-dashed border-gray-200 flex items-center justify-center text-4xl hover:border-[#FFD23F] transition-all">
                {icon}
              </button>
              {/* Input is hidden but focused programmatically by handleEmojiClick */}
              <input 
                ref={emojiInputRef} 
                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" 
                type="text" 
                onChange={handleEmojiChange} 
              />
              <div className="text-center mt-2 text-[10px] text-gray-400">点击更换 Emoji</div>
            </div>
          </div>
          <div className="pt-2 pb-10"><Button onClick={handleCreate} disabled={!name} className="w-full !text-white !shadow-lg hover:!brightness-110 active:!scale-95 disabled:opacity-50 disabled:shadow-none" style={{ backgroundColor: theme.primary, boxShadow: name ? `0 10px 20px -5px ${theme.primary}66` : 'none' }}>创建计时器</Button></div>
        </div>
      </div>
    </div>
  );
};

const TimerView = ({ timerSystem, onMinimize, onCategoryChange }) => {
  const { categories, timers, activeTimerId, startTimer, pauseTimer, deleteTimer, createTimer, deleteCategory, addCategory } = timerSystem;
  const [selectedCatId, setSelectedCatId] = useState('uncategorized');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false); // [NEW] Control category modal
  const [setupTimer, setSetupTimer] = useState(null); 
  const currentTimers = timers.filter(t => t.categoryId === selectedCatId);
  const activeCat = categories.find(c => c.id === selectedCatId) || categories[0];
  const theme = getCategoryTheme(activeCat); // [FIX] Pass object, not ID, to support custom colors
  const isSingleMode = currentTimers.length === 1; 

  useEffect(() => { if (onCategoryChange) { onCategoryChange(theme.primary); } }, [selectedCatId, theme.primary, onCategoryChange]);
  const formatTime = (s) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60; return `${h > 0 ? h+':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`; };
  const handlePlayClick = (timer) => { const isActive = activeTimerId === timer.id; if (isActive) { pauseTimer(timer.id); } else { setSetupTimer(timer); } };
  const handleConfirmStart = (config) => { if (setupTimer) { startTimer(setupTimer.id, config); setSetupTimer(null); } };
  const handleImmediateStart = (newId) => { startTimer(newId, null); };

  return (
    <div className="flex h-full" style={{ backgroundColor: MACARON_COLORS.bg }}>
      <div className="w-[90px] h-full flex flex-col items-center py-8 border-r border-[#F0F0F0] bg-white/50 backdrop-blur-sm overflow-y-auto scrollbar-hide z-10">
        <div className="space-y-3 w-full flex flex-col items-center px-2">
          {categories.map(cat => {
            const isSelected = selectedCatId === cat.id;
            const catTheme = getCategoryTheme(cat); // [FIX] Pass object
            return (<button key={cat.id} onClick={() => setSelectedCatId(cat.id)} className={`relative w-full py-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${isSelected ? 'shadow-md scale-105' : 'hover:bg-white/80 hover:scale-105'}`} style={{ backgroundColor: isSelected ? catTheme.primary : 'transparent' }}>{!isSelected && <div className="absolute left-2 w-1 h-1 rounded-full bg-gray-300" />}<span className={`text-xs font-black tracking-widest writing-vertical-rl ${isSelected ? 'text-white' : 'text-gray-400'}`} style={{ writingMode: cat.label.length > 3 ? 'vertical-rl' : 'horizontal-tb', textOrientation: 'upright' }}>{cat.label}</span></button>);
          })}
          <div className="w-full h-[1px] bg-gray-200 my-2" />
          {/* [MODIFIED] Open Category Modal instead of prompt */}
          <button onClick={() => setShowCatModal(true)} className="w-full py-3 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all group hover:brightness-90" style={{ borderColor: theme.primary, color: theme.primary, backgroundColor: `${theme.primary}10` }}><Plus size={18} className="group-hover:rotate-90 transition-transform"/></button>
        </div>
      </div>
      <div className="flex-1 flex flex-col h-full relative overflow-hidden transition-all duration-500">
        <div className="px-8 pt-10 pb-4 flex justify-between items-end bg-gradient-to-b from-[#FFFDF7] to-transparent z-10">
          <div><div className="flex items-center gap-2 mb-1"><h2 className="text-4xl font-black text-[#2D2D2D] tracking-tight">{activeCat.label}</h2>{activeCat.id !== 'uncategorized' && <button onClick={() => deleteCategory(activeCat.id)} className="text-gray-200 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>}</div><p className="text-xs font-bold uppercase tracking-wider opacity-60" style={{ color: theme.primary }}>{currentTimers.length} TASKS • {isSingleMode ? 'FOCUS MODE' : 'TODAY'}</p></div>
          <button onClick={() => setShowAddModal(true)} className="w-14 h-14 rounded-[20px] flex items-center justify-center text-white shadow-xl hover:brightness-110 active:scale-90 transition-all" style={{ backgroundColor: theme.primary, boxShadow: `0 10px 20px -5px ${theme.primary}66` }}><Plus size={28} strokeWidth={3} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 pb-32 scrollbar-hide">
          <div className={`transition-all duration-500 ${isSingleMode ? 'h-full flex flex-col justify-center pb-20' : 'flex flex-col gap-5'}`}>
            {currentTimers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-60"><div className="w-40 h-40 rounded-full mb-8 flex items-center justify-center bg-opacity-10 animate-pulse-slow" style={{ backgroundColor: `${theme.primary}20` }}><CloudSun size={80} style={{ color: theme.primary }} /></div><p className="text-[#2D2D2D] font-bold text-lg">这里的风景很安静</p><p className="text-[#8A8A8A] text-sm mt-2">添加一个任务，开启专注之旅</p></div>
            ) : (
              currentTimers.map(timer => {
                const isActive = activeTimerId === timer.id;
                const timeLeft = timer.duration ? timer.duration - timer.elapsed : timer.elapsed;
                const progress = timer.duration ? (timer.elapsed / timer.duration) * 100 : 0;
                const TypeIcon = getTimerIcon(timer.type);
                const cardHeight = isSingleMode ? 'h-[520px]' : 'h-auto min-h-[140px]'; 
                const titleSize = isSingleMode ? 'text-3xl' : 'text-xl';
                const timeSize = isSingleMode ? 'text-7xl' : 'text-4xl'; 
                const timeWeight = isSingleMode ? 'font-semibold' : 'font-black';
                return (
                  <div key={timer.id} className={`relative w-full rounded-[40px] p-8 transition-all duration-700 overflow-hidden group ${isSingleMode ? 'shadow-2xl scale-100' : 'shadow-sm hover:shadow-md hover:scale-[1.01]'} ${cardHeight}`} style={{ backgroundColor: isActive ? 'white' : (isSingleMode ? 'white' : `${theme.primary}15`), boxShadow: isActive || isSingleMode ? `0 25px 50px -12px ${theme.primary}30` : undefined, border: isActive ? `3px solid ${theme.primary}` : (isSingleMode ? '1px solid rgba(0,0,0,0.03)' : '3px solid transparent') }}>
                    {(isActive || isSingleMode) && timer.duration > 0 && (<div className="absolute left-0 top-0 bottom-0 transition-all duration-1000 ease-linear opacity-[0.08]" style={{ width: `${progress}%`, backgroundColor: theme.primary }} />)}
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4"><div className={`rounded-2xl flex items-center justify-center text-white shadow-sm transition-all ${isSingleMode ? 'w-14 h-14' : 'w-12 h-12'}`} style={{ backgroundColor: isActive ? '#FFD23F' : theme.primary }}><TypeIcon size={isSingleMode ? 28 : 22} strokeWidth={2.5} /></div><div><h4 className={`${titleSize} font-black tracking-tight text-[#2D2D2D] line-clamp-1`}>{timer.name}</h4><div className="flex items-center gap-2 mt-1">{timer.status === 'completed' ? (<span className="text-xs font-black uppercase tracking-wider text-[#42D4A4] bg-[#E0F9F1] px-2 py-0.5 rounded-full">Completed</span>) : (isSingleMode && <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Focus</span>)}</div></div></div>
                        <div className="flex gap-2">{isActive ? (<button onClick={onMinimize} className="p-3 rounded-full hover:bg-gray-100 text-gray-400 hover:text-[#2D2D2D] transition-colors"><Minimize2 size={20} /></button>) : (<button onClick={() => deleteTimer(timer.id)} className="p-3 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"><X size={20} /></button>)}</div>
                      </div>
                      <div className={`flex-1 flex flex-col items-center justify-center gap-6 ${isSingleMode ? 'py-4' : 'items-start justify-end py-0'}`}><div className={`${timeSize} ${timeWeight} font-mono tracking-tighter tabular-nums transition-all leading-none`} style={{ color: isActive ? '#2D2D2D' : `${theme.primary}CC` }}>{formatTime(timeLeft)}</div>{isSingleMode && (<p className="text-[#2D2D2D] opacity-60 font-medium text-sm text-center max-w-[80%] animate-fade-in">{isActive ? "全神贯注，此刻即是永恒。" : "准备好了吗？点击开始进入心流状态。"}</p>)}</div>
                      <div className={`flex w-full transition-all duration-500 ${isSingleMode ? 'justify-center pb-4' : 'justify-end'}`}><button onClick={() => handlePlayClick(timer)} className={`rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all hover:brightness-110 ${isSingleMode ? 'w-20 h-20' : 'w-14 h-14 absolute bottom-8 right-8'} `} style={{ backgroundColor: isActive ? '#FFD23F' : theme.primary, boxShadow: `0 10px 20px -5px ${isActive ? '#FFD23F' : theme.primary}66` }}>{isActive ? <Pause fill="white" size={isSingleMode ? 32 : 24} /> : <Play fill="white" size={isSingleMode ? 32 : 24} className="ml-1" />}</button></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {showAddModal && <CreateTimerModal categoryId={selectedCatId} categories={categories} onClose={() => setShowAddModal(false)} onCreate={createTimer} onStartImmediate={handleImmediateStart} />}
      {showCatModal && <AddCategoryModal onClose={() => setShowCatModal(false)} onConfirm={addCategory} />}
      {setupTimer && <StartTimerSetupModal timer={setupTimer} onClose={() => setSetupTimer(null)} onStart={handleConfirmStart} />}
    </div>
  );
};

const TopTimerBar = ({ timer, onStop }) => {
  if (!timer) return null;
  const timeLeft = timer.duration ? timer.duration - timer.elapsed : timer.elapsed;
  const progress = timer.duration ? (timer.elapsed / timer.duration) * 100 : 0;
  const format = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  return (
    <div className="absolute top-[50px] left-1/2 -translate-x-1/2 w-[90%] h-14 bg-[#2D2D2D] text-white rounded-full shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] z-40 flex items-center px-5 animate-slide-down border-2 border-white">
      <div className="w-9 h-9 rounded-full bg-[#42D4A4] flex items-center justify-center text-lg mr-3 animate-pulse">{timer.icon}</div>
      <div className="flex-1"><div className="flex justify-between items-end mb-1"><span className="text-xs font-bold truncate max-w-[120px]">{timer.name}</span><span className="font-mono text-sm font-bold text-[#42D4A4]">{format(timeLeft)}</span></div><div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden"><div className="h-full bg-[#42D4A4] transition-all duration-1000 ease-linear" style={{ width: `${timer.duration ? 100 - progress : 100}%` }} /></div></div>
      <button onClick={onStop} className="ml-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white bg-white/10 rounded-full"><X size={16} /></button>
    </div>
  );
};

// --- [REPLACED] Journal System Components ---

// 今日小报组件
const DailyRecapModal = ({ journal, onClose }) => {
  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="w-[85%] bg-white rounded-[32px] overflow-hidden shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="bg-[#FF85A1] p-6 text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full" />
          <h3 className="text-2xl font-black mb-1">今日小报</h3>
          <p className="opacity-80 text-xs">Daily Recap • {new Date().toLocaleDateString()}</p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#FFF0F3] flex items-center justify-center text-3xl shadow-sm">
              {MACARON_COLORS.moods[journal.mood] ? '😊' : '😐'} 
              {/* 这里简化了Mood Icon映射 */}
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase">今日心情</p>
              <p className="text-lg font-black text-[#2D2D2D] capitalize">{journal.mood || 'Peaceful'}</p>
            </div>
          </div>
          
          <div className="bg-[#F9FAFB] rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2 text-[#FF85A1]">
              <Sparkles size={16} />
              <span className="text-xs font-bold">糖果罐</span>
            </div>
            <p className="text-sm text-[#2D2D2D] leading-relaxed">
              "生活原本沉闷，但跑起来就有风。今天也是闪闪发光的一天！✨"
            </p>
          </div>

          <div className="mb-6">
              <p className="text-xs text-gray-400 font-bold uppercase mb-2">日记摘要</p>
              <p className="text-sm text-[#2D2D2D] line-clamp-3">{journal.content}</p>
          </div>

          <Button onClick={onClose} style={{ backgroundColor: '#FF85A1' }}>分享到朋友圈</Button>
        </div>
      </div>
    </div>
  );
};

// [NEW] Unfinished Task Review Component
const UnfinishedTaskReview = ({ unfinishedTasks, selectedReasons, onReasonSelect }) => {
  const reasons = ['太累了 😫', '忘记了 🧠', '突然有事 ⚡', '计划太满 📅', '单纯不想做 🛌'];
  
  if (!unfinishedTasks || unfinishedTasks.length === 0) return null;

  return (
    <div className="bg-[#FFF0F3] rounded-2xl p-5 mb-4 border border-[#FF85A1]/20">
      <div className="flex items-center gap-2 mb-3 text-[#D9455F]">
        <AlertCircle size={16} />
        <span className="text-xs font-bold">未完成事项复盘</span>
      </div>
      <div className="space-y-4">
        {unfinishedTasks.map(task => (
          <div key={task.id} className="bg-white/60 rounded-xl p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm text-[#D9455F]">{task.name}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {reasons.map(r => (
                <button
                  key={r}
                  onClick={() => onReasonSelect(task.id, r)}
                  className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${
                    selectedReasons[task.id] === r 
                      ? 'bg-[#FF85A1] text-white border-[#FF85A1]' 
                      : 'bg-white text-gray-400 border-gray-100 hover:border-[#FF85A1]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// [NEW] Image Grid Component
const ImageGrid = ({ images, onDelete, readOnly = false }) => {
  if (!images || images.length === 0) return null;
  
  const gridCols = images.length === 1 ? 'grid-cols-1' : images.length === 2 || images.length === 4 ? 'grid-cols-2' : 'grid-cols-3';
  
  return (
    <div className={`grid ${gridCols} gap-1 mb-2 rounded-xl overflow-hidden`}>
      {images.map((img, idx) => (
        <div key={idx} className={`relative bg-gray-100 ${images.length === 1 ? 'aspect-video' : 'aspect-square'}`}>
          {/* In a real app, this would be an <img> tag. Using placeholder div. */}
          <div className="w-full h-full flex items-center justify-center text-gray-300 bg-cover bg-center" style={{ backgroundImage: `url(${img})` }}>
              {!img && <ImageIcon size={24} />}
          </div>
          {!readOnly && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(idx); }}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// [REPLACED] JournalView
const JournalView = ({ journalSystem, timerSystem }) => {
  const { journals, addJournal, updateJournal, deleteJournal, saveDraft, draft } = journalSystem;
  const { timers } = timerSystem; // To get unfinished tasks
  
  const [view, setView] = useState('list'); // 'list' | 'editor'
  const [filterDate, setFilterDate] = useState(null); // Date string or null
  const [showRecap, setShowRecap] = useState(false);
  const [currentJournal, setCurrentJournal] = useState(null); // For recap display
  const [showDatePicker, setShowDatePicker] = useState(false); // [NEW] Control custom calendar

  // Editor State
  const [editorId, setEditorId] = useState(null); // null for new, ID for edit
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(null); // [MODIFIED] Mood is optional, defaults to null
  const [images, setImages] = useState([]);
  const [bodySensation, setBodySensation] = useState([]);
  const [unfinishedReasons, setUnfinishedReasons] = useState({});

  // Derived: Unfinished tasks for today
  const unfinishedTasks = useMemo(() => {
    // In a real app, filter by date. Here just taking non-completed timers.
    return timers.filter(t => t.status !== 'completed' && t.elapsed > 0);
  }, [timers]);

  // Load Draft or Init Editor
  const openEditor = (journal = null) => {
    if (journal) {
      setEditorId(journal.id);
      setContent(journal.content);
      setMood(journal.mood);
      setImages(journal.images || []);
      setBodySensation(journal.bodySensation || []);
      setUnfinishedReasons(journal.uncompletedReasons || {});
    } else if (draft) {
      setEditorId(null);
      setContent(draft.content || '');
      setMood(draft.mood || null); // Default null
      setImages(draft.images || []);
      setBodySensation(draft.bodySensation || []);
      setUnfinishedReasons(draft.uncompletedReasons || {});
    } else {
      setEditorId(null);
      setContent('');
      setMood(null); // Default null
      setImages([]);
      setBodySensation([]);
      setUnfinishedReasons({});
    }
    setView('editor');
  };

  // Auto-save draft
  useEffect(() => {
    if (view === 'editor' && !editorId) {
      const timer = setTimeout(() => {
        saveDraft({ content, mood, images, bodySensation, uncompletedReasons: unfinishedReasons });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [content, mood, images, bodySensation, unfinishedReasons, view, editorId]);

  const handleSave = () => {
    if (!content.trim() && images.length === 0) return;
    
    const entryData = {
      content,
      mood,
      images,
      bodySensation,
      uncompletedReasons: unfinishedReasons,
      date: editorId ? (journals.find(j => j.id === editorId).date) : Date.now()
    };

    if (editorId) {
      updateJournal(editorId, entryData);
      setCurrentJournal({ ...entryData, id: editorId });
    } else {
      addJournal(entryData);
      setCurrentJournal({ ...entryData, id: 'temp' });
    }
    
    setView('list');
    setShowRecap(true); // Show recap after save
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这篇日记吗？')) {
      deleteJournal(id);
    }
  };

  // Mock Image Upload
  const handleAddImage = () => {
    if (images.length >= 9) return;
    // Simulating a random image URL for demo purposes
    const colors = ['FF8CA1', 'FFD23F', '42D4A4', '6CB6FF', 'B589F6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const mockUrl = `https://placehold.co/400x400/${randomColor}/FFFFFF?text=IMG`;
    setImages([...images, mockUrl]);
  };

  const handleReasonSelect = (taskId, reason) => {
    setUnfinishedReasons(prev => ({
      ...prev,
      [taskId]: reason
    }));
  };

  const handleBodySensationToggle = (sensation) => {
    setBodySensation(prev => prev.includes(sensation) ? prev.filter(s => s !== sensation) : [...prev, sensation]);
  };

  const filteredJournals = filterDate 
    ? journals.filter(j => new Date(j.date).toLocaleDateString() === new Date(filterDate).toLocaleDateString())
    : journals;

  if (view === 'editor') {
    return (
      <div className="flex flex-col h-full bg-[#FFFDF7] relative animate-slide-up">
        {/* Editor Header */}
        <div className="px-6 pt-10 pb-4 flex justify-between items-center bg-white/50 backdrop-blur-sm z-10 sticky top-0">
          <button onClick={() => setView('list')} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
          <span className="font-bold text-[#2D2D2D]">{editorId ? '编辑日记' : '写日记'}</span>
          <button onClick={handleSave} className="text-[#FF85A1] font-bold"><Check size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10 scrollbar-hide">
          {/* Mood Selector - [MODIFIED] Optional Selection + Fixed Height */}
          <div className="mb-6">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">当下心情 (可选)</span>
            <div className="flex gap-3 overflow-x-auto p-2 pb-4 scrollbar-hide -mx-2 px-2">
              {Object.entries(MACARON_COLORS.moods).map(([key, color]) => (
                <button 
                  key={key} 
                  onClick={() => setMood(mood === key ? null : key)} // Toggle logic
                  className={`w-12 h-12 rounded-full flex-shrink-0 transition-all duration-300 flex items-center justify-center text-xl ${mood === key ? 'scale-110 ring-4 ring-offset-2 ring-[#FF85A1]/20 shadow-md' : 'opacity-40 hover:opacity-100 grayscale'}`}
                  style={{ backgroundColor: color }}
                >
                  {key === 'happy' ? '😄' : key === 'calm' ? '😌' : key === 'sad' ? '😔' : key === 'angry' ? '😠' : '😴'}
                </button>
              ))}
            </div>
          </div>

          {/* Body Sensation */}
          <div className="mb-6">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">身体感受</span>
            <div className="flex flex-wrap gap-2">
              {['精力充沛 ⚡', '有点累 🔋', '沉重 ☁️', '轻松 🍃', '酸痛 🤕'].map(s => (
                <button 
                  key={s}
                  onClick={() => handleBodySensationToggle(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${bodySensation.includes(s) ? 'bg-[#FF85A1] text-white border-[#FF85A1]' : 'bg-white text-gray-400 border-gray-200'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Unfinished Task Review */}
          {!editorId && <UnfinishedTaskReview unfinishedTasks={unfinishedTasks} selectedReasons={unfinishedReasons} onReasonSelect={handleReasonSelect} />}

          {/* Text Area */}
          <div className="mb-4">
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="记录此刻的想法... (支持 Markdown: **粗体**)"
              className="w-full h-40 bg-transparent text-[#2D2D2D] text-base leading-relaxed outline-none resize-none placeholder:text-gray-300"
            />
          </div>

          {/* Image Grid (Editor) */}
          <ImageGrid images={images} onDelete={(idx) => setImages(images.filter((_, i) => i !== idx))} />
          
          {/* Add Image Button */}
          {images.length < 9 && (
            <button onClick={handleAddImage} className="w-20 h-20 bg-[#F9FAFB] rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-[#FF85A1] hover:text-[#FF85A1] transition-all">
              <Camera size={24} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FFFDF7] relative overflow-hidden">
      {/* Header - [MODIFIED] New Calendar Logic */}
      <div className="px-6 pt-10 pb-4 z-10 bg-[#FFFDF7]/90 backdrop-blur-sm sticky top-0 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-[#2D2D2D] mb-1">心情日记</h2>
          <p className="text-xs font-bold text-[#FF85A1] uppercase tracking-wider">MOMENTS & THOUGHTS</p>
        </div>
        <div className="flex gap-2">
           {/* Date Filter Button */}
           <button 
             onClick={() => setShowDatePicker(true)}
             className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${filterDate ? 'bg-[#FF85A1] text-white' : 'bg-white text-gray-400 shadow-sm'}`}
           >
             <CalendarDays size={18} />
           </button>
           {/* New Entry */}
           <button onClick={() => openEditor()} className="w-10 h-10 rounded-full bg-[#2D2D2D] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all">
             <Plus size={20} />
           </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 scrollbar-hide">
        {filterDate && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-gray-400">筛选: {new Date(filterDate).toLocaleDateString()}</span>
            <button onClick={() => setFilterDate(null)} className="text-[#FF85A1]"><XCircle size={14} /></button>
          </div>
        )}

        <div className="space-y-6">
          {filteredJournals.length === 0 ? (
            <div className="text-center py-20 opacity-40">
              <BookHeart size={48} className="mx-auto mb-2 text-[#FF85A1]" />
              <p className="text-sm font-bold">写下第一篇日记吧</p>
            </div>
          ) : (
            filteredJournals.map(j => (
               <div key={j.id} className="group relative pl-4 border-l-2 border-gray-100 pb-8 last:pb-0">
                 {/* Timeline Dot */}
                 <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: j.mood ? (MACARON_COLORS.moods[j.mood] || '#E5E5E5') : '#E5E5E5' }} />
                 
                 {/* Header */}
                 <div className="flex justify-between items-start mb-2">
                   <div>
                     <span className="text-lg font-black text-[#2D2D2D] mr-2">{new Date(j.date).getDate()}</span>
                     <span className="text-xs font-bold text-gray-400 uppercase">{new Date(j.date).toLocaleString('default', { month: 'short' })} • {new Date(j.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                   </div>
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                     <button onClick={() => openEditor(j)} className="text-gray-300 hover:text-[#2D2D2D]"><Edit3 size={14} /></button>
                     <button onClick={(e) => handleDelete(j.id, e)} className="text-gray-300 hover:text-red-400"><Trash2 size={14} /></button>
                   </div>
                 </div>

                 {/* Content */}
                 <div className="bg-white p-5 rounded-[24px] shadow-sm mb-2">
                    <p className="text-[#2D2D2D] text-sm leading-relaxed whitespace-pre-wrap mb-3">
                      {/* Simple Markdown Bold rendering */}
                      {j.content.split(/(\*\*.*?\*\*)/).map((part, i) => 
                        part.startsWith('**') && part.endsWith('**') 
                          ? <strong key={i}>{part.slice(2, -2)}</strong> 
                          : part
                      )}
                    </p>
                    
                    {/* Image Grid in List */}
                    <ImageGrid images={j.images} readOnly />

                    {/* Tags (Body Sensation) */}
                    {j.bodySensation && j.bodySensation.length > 0 && (
                      <div className="flex flex-wrap gap-1mt-2">
                        {j.bodySensation.map(s => <span key={s} className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">#{s}</span>)}
                      </div>
                    )}
                 </div>
               </div>
            ))
          )}
        </div>
      </div>

      {showRecap && currentJournal && <DailyRecapModal journal={currentJournal} onClose={() => setShowRecap(false)} />}
      
      {/* [NEW] Custom Date Picker Modal */}
      {showDatePicker && (
        <CustomDatePickerModal 
           currentDate={filterDate} 
           onClose={() => setShowDatePicker(false)} 
           onSelect={(date) => setFilterDate(date)} 
        />
      )}
    </div>
  );
};

// --- [RESTORATION] 复盘视图 (ReviewView) ---
// [MODIFIED] Added 3 Tabs for Review (Progress, Review, Habits)
const ReviewView = ({ timerSystem, habitSystem, reviewLogic }) => {
  const [subTab, setSubTab] = useState('progress'); // progress, review, habits
  const { habits, toggleCheckIn, addHabit } = habitSystem;
  const { aiReport, loading, generateReport } = reviewLogic;
  const { timers } = timerSystem;
  
  const themeColor = MACARON_COLORS.themes.review;

  // Calculate Today's Stats
  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayTimers = timers.filter(t => new Date(t.createdAt).toDateString() === today);
    const totalSeconds = todayTimers.reduce((acc, t) => acc + t.elapsed, 0);
    const completedTasks = todayTimers.filter(t => t.status === 'completed').length;
    return {
      hours: Math.floor(totalSeconds / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      count: todayTimers.length,
      completed: completedTasks
    };
  }, [timers]);

  return (
    <div className="flex flex-col h-full bg-[#FFFDF7]">
      {/* Header & Tabs */}
      <div className="px-6 pt-10 pb-4">
        <h2 className="text-3xl font-black text-[#2D2D2D] mb-4">每日复盘</h2>
        <div className="flex p-1 bg-white rounded-xl border border-gray-100 shadow-sm">
          {[
            { id: 'progress', label: '当前进度' },
            { id: 'review', label: '复盘' },
            { id: 'habits', label: '习惯打卡' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                subTab === tab.id 
                  ? 'bg-[#B589F6] text-white shadow-md' 
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 scrollbar-hide">
        
        {/* Tab 1: Current Progress */}
        {subTab === 'progress' && (
          <div className="space-y-4 animate-fade-in">
             <div className="bg-white rounded-[32px] p-8 shadow-sm text-center border-4 border-[#F4EBFF]">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">今日专注时长</div>
                <div className="text-5xl font-black text-[#7E4CCB] mb-2">
                  {todayStats.hours}<span className="text-xl">h</span> {todayStats.minutes}<span className="text-xl">m</span>
                </div>
                <div className="flex justify-center gap-4 mt-6">
                   <div className="bg-[#F9FAFB] px-4 py-2 rounded-xl">
                      <div className="text-xs text-gray-400 font-bold">总任务</div>
                      <div className="text-xl font-black text-[#2D2D2D]">{todayStats.count}</div>
                   </div>
                   <div className="bg-[#F9FAFB] px-4 py-2 rounded-xl">
                      <div className="text-xs text-gray-400 font-bold">已完成</div>
                      <div className="text-xl font-black text-[#2D2D2D]">{todayStats.completed}</div>
                   </div>
                </div>
             </div>
             
             {/* Chart Placeholder */}
             <div className="bg-white rounded-[24px] p-6 shadow-sm flex flex-col items-center justify-center h-48 opacity-60">
                <BarChart3 size={40} className="text-[#B589F6] mb-2"/>
                <p className="text-xs font-bold text-gray-400">专注分布图表 (Coming Soon)</p>
             </div>
          </div>
        )}

        {/* Tab 2: Review (AI) */}
        {subTab === 'review' && (
           <div className="bg-gradient-to-br from-[#F4EBFF] to-white rounded-[32px] p-6 shadow-sm border border-[#B589F6]/20 animate-fade-in">
             <div className="flex items-center gap-2 mb-4">
               <Sparkles size={20} className="text-[#B589F6]" />
               <h3 className="font-bold text-lg text-[#7E4CCB]">AI 智能复盘</h3>
             </div>
             
             {aiReport ? (
                <div className="space-y-4">
                   <div className="bg-white/60 p-4 rounded-2xl text-sm text-[#2D2D2D] leading-relaxed whitespace-pre-line">{aiReport.summary}</div>
                   <div className="bg-[#B589F6]/10 p-4 rounded-2xl text-sm text-[#7E4CCB] leading-relaxed whitespace-pre-line border border-[#B589F6]/20">{aiReport.advice}</div>
                   <Button onClick={generateReport} variant="outline" className="mt-2 text-sm h-10">重新生成</Button>
                </div>
             ) : (
                <div className="text-center py-6">
                   <p className="text-[#8A8A8A] text-xs mb-4">基于你的专注记录和习惯生成日报</p>
                   <Button onClick={generateReport} disabled={loading} style={{ backgroundColor: themeColor }} className="w-full">
                     {loading ? 'AI 正在思考...' : '生成今日报告'}
                   </Button>
                </div>
             )}
           </div>
        )}

        {/* Tab 3: Habits */}
        {subTab === 'habits' && (
          <div className="bg-white rounded-[32px] p-6 shadow-sm mb-6 relative overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">习惯打卡</h3>
              <button onClick={() => { const n=prompt("新习惯"); if(n) addHabit({name:n}) }} className="w-8 h-8 rounded-full bg-[#F4EBFF] text-[#B589F6] flex items-center justify-center hover:bg-[#B589F6] hover:text-white transition-colors"><Plus size={16} /></button>
            </div>
            <div className="space-y-3">
              {habits.map(h => {
                const isDone = h.completedDates.includes(new Date().toDateString());
                return (
                  <div key={h.id} onClick={() => toggleCheckIn(h.id)} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${isDone ? 'bg-[#F4EBFF]' : 'bg-[#F9FAFB]'}`}>
                    <span className={`font-bold text-sm ${isDone ? 'text-[#7E4CCB]' : 'text-gray-500'}`}>{h.name}</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-[#B589F6] border-[#B589F6]' : 'border-gray-300'}`}>
                      {isDone && <Check size={14} className="text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// --- [RESTORATION] 计划视图 (PlanView) ---
// [MODIFIED] Directly embeds setup fields in step 1, removed PlanSetupModal
const PlanView = ({ timerSystem, planLogic }) => {
  const { step, tasks, addTask, scheduleData, generating, generate, playTask } = planLogic;
  
  // Local state for setup fields
  const [bedtime, setBedtime] = useState('00:00');
  const [taskName, setTaskName] = useState('');
  const [taskDuration, setTaskDuration] = useState(25);
  const [mentalStatus, setMentalStatus] = useState('normal'); 
  const [psychStatus, setPsychStatus] = useState('calm'); 
  const [lifestyle, setLifestyle] = useState({ breakfast: false, lunch: false, dinner: false, morningWash: false, nightWash: false });

  const themeColor = MACARON_COLORS.themes.plan;

  const toggleLifestyle = (key) => setLifestyle(prev => ({ ...prev, [key]: !prev[key] }));

  const handleGenerate = () => {
      // 1. 如果填了新任务，先添加
      if (taskName) {
          addTask(taskName, taskDuration);
          // 清空输入框以防重复添加
          setTaskName('');
      }
      // 2. 调用生成逻辑，传入所有配置
      generate(bedtime, lifestyle, mentalStatus, psychStatus); 
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFDF7]">
      <div className="px-6 pt-10 pb-4">
        <h2 className="text-3xl font-black text-[#2D2D2D] mb-1">智能计划</h2>
        <p className="text-xs font-bold text-[#42D4A4] uppercase tracking-wider">AI SCHEDULE MAKER</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 scrollbar-hide">
        {step === 1 ? (
          <div className="space-y-6 animate-slide-up">
            
            {/* 1. 预计就寝 */}
            <div className="bg-white rounded-[24px] p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-gray-500 font-bold text-sm"><Moon size={16} /> 预计就寝</div>
                <input 
                    type="time" 
                    value={bedtime}
                    onChange={(e) => setBedtime(e.target.value)}
                    className="w-full bg-[#F9FAFB] rounded-xl p-3 text-xl font-black text-center text-[#2D2D2D] outline-none"
                />
            </div>

            {/* 2. 待办任务录入 */}
            <div className="bg-white rounded-[24px] p-5 shadow-sm">
               <h3 className="font-bold text-lg mb-4 text-[#2D2D2D]">今日待办</h3>
               
               {/* 现有任务列表 */}
               {tasks.length > 0 && (
                   <div className="space-y-2 mb-4">
                     {tasks.map(t => (
                       <div key={t.id} className="flex items-center justify-between p-3 bg-[#E0F9F1] rounded-xl text-[#1B8C69] font-bold text-sm">
                         <span>{t.name}</span>
                         <span className="text-xs opacity-60">{t.duration}min</span>
                       </div>
                     ))}
                   </div>
               )}

               {/* 新任务输入 */}
               <div className="space-y-3">
                    <input 
                        value={taskName}
                        onChange={e => setTaskName(e.target.value)}
                        placeholder="输入任务名称..."
                        className="w-full bg-[#F9FAFB] border-2 border-transparent p-3 rounded-xl outline-none font-bold text-[#2D2D2D] focus:bg-white focus:border-[#42D4A4] text-sm"
                    />
                    {taskName && (
                        <div className="flex items-center gap-3 bg-[#F9FAFB] p-2 rounded-xl transition-all">
                            <Clock size={16} className="text-gray-400 ml-2" />
                            <input 
                                type="range" min="15" max="120" step="5"
                                value={taskDuration} onChange={e => setTaskDuration(Number(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#42D4A4]"
                            />
                            <span className="text-xs font-bold w-12 text-right text-gray-500">{taskDuration}m</span>
                            {/* 允许直接添加而不生成 */}
                            <button 
                                onClick={() => { addTask(taskName, taskDuration); setTaskName(''); }}
                                className="p-2 bg-[#42D4A4] text-white rounded-lg"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    )}
               </div>
            </div>

            {/* 3 & 4. 状态评估 (可选) */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-[24px] p-4 shadow-sm">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">精神状态</div>
                    <div className="flex flex-col gap-2">
                        {[{ id: 'energetic', l: '充沛', i: '⚡' }, { id: 'normal', l: '一般', i: '😐' }, { id: 'tired', l: '疲惫', i: '😫' }].map(s => (
                            <button key={s.id} onClick={() => setMentalStatus(s.id)} className={`py-2 px-3 rounded-lg text-xs font-bold text-left transition-all border ${mentalStatus === s.id ? 'border-[#42D4A4] bg-[#E0F9F1] text-[#1B8C69]' : 'border-transparent bg-[#F9FAFB] text-gray-400'}`}>
                                <span className="mr-2">{s.i}</span>{s.l}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="bg-white rounded-[24px] p-4 shadow-sm">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">心理状态</div>
                    <div className="flex flex-col gap-2">
                        {[{ id: 'happy', l: '开心', i: '😄' }, { id: 'calm', l: '平静', i: '😌' }, { id: 'anxious', l: '焦虑', i: '😰' }].map(s => (
                            <button key={s.id} onClick={() => setPsychStatus(s.id)} className={`py-2 px-3 rounded-lg text-xs font-bold text-left transition-all border ${psychStatus === s.id ? 'border-[#FFD23F] bg-[#FFFBE6] text-[#B88E00]' : 'border-transparent bg-[#F9FAFB] text-gray-400'}`}>
                                <span className="mr-2">{s.i}</span>{s.l}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 5. 生活状态 (可选) */}
            <div className="bg-white rounded-[24px] p-5 shadow-sm">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">生活状态打卡</div>
                <div className="flex flex-wrap gap-2">
                    {[{ id: 'breakfast', l: '早餐', i: '🍳' }, { id: 'lunch', l: '午餐', i: '🍱' }, { id: 'dinner', l: '晚餐', i: '🍲' }, { id: 'morningWash', l: '晨洗', i: '🪥' }, { id: 'nightWash', l: '晚洗', i: '🛁' }].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => toggleLifestyle(opt.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${lifestyle[opt.id] ? 'bg-[#6CB6FF] border-[#6CB6FF] text-white' : 'bg-[#F9FAFB] border-transparent text-gray-400'}`}
                        >
                            <span>{opt.i}</span> {opt.l}
                        </button>
                    ))}
                </div>
            </div>

            {/* 生成按钮 */}
            <div className="pb-6">
               <Button onClick={handleGenerate} disabled={generating} style={{ backgroundColor: themeColor }} className="w-full shadow-lg">
                 {generating ? 'AI 正在生成计划...' : '生成今日时间表'}
               </Button>
            </div>
          </div>
        ) : (
          <div className="animate-slide-up">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg">今日安排</h3>
               <button onClick={() => planLogic.setStep(1)} className="text-xs font-bold text-[#42D4A4] bg-white px-3 py-1 rounded-full border border-[#42D4A4]">重置</button>
             </div>
             <div className="space-y-4">
               {scheduleData && scheduleData.schedule.map((item, idx) => (
                 <div key={idx} className="bg-white p-5 rounded-[24px] shadow-sm flex items-center justify-between group">
                   <div className="flex items-center gap-4">
                     <div className="text-xs font-mono font-bold text-gray-400 flex flex-col items-center">
                       <span>{new Date(item.start).getHours()}:00</span>
                       <div className="w-0.5 h-6 bg-gray-100 my-1 group-last:hidden" />
                     </div>
                     <div>
                       <h4 className="font-bold text-[#2D2D2D]">{item.name}</h4>
                       <span className="text-[10px] text-[#42D4A4] bg-[#E0F9F1] px-2 py-0.5 rounded-full font-bold">推荐专注</span>
                     </div>
                   </div>
                   <button onClick={() => playTask(item)} className="w-10 h-10 rounded-full bg-[#F0F0F0] hover:bg-[#42D4A4] hover:text-white flex items-center justify-center transition-all text-gray-400">
                     <Play size={16} fill="currentColor" />
                   </button>
                 </div>
               ))}
               <div className="bg-[#EAF4FF] p-4 rounded-2xl text-center">
                  <p className="text-[#2B73B8] text-xs font-bold">建议就寝时间: {new Date(scheduleData?.bedtimeMs).getHours()}:00</p>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- [RESTORATION] 设置视图 (SettingsView) ---
// [MODIFIED] Added FocusSettingsModal integration
const SettingsView = ({ settingsSystem, dataSystem, habitSystem, onEditRatio }) => {
  const { user, pomodoroConfig, setPomodoroConfig } = settingsSystem;
  const [showFocusModal, setShowFocusModal] = useState(false); // [NEW]
  const themeColor = MACARON_COLORS.themes.settings;

  return (
    <div className="flex flex-col h-full bg-[#FFFDF7]">
      <div className="px-6 pt-10 pb-4">
        <h2 className="text-3xl font-black text-[#2D2D2D] mb-1">设置</h2>
        <p className="text-xs font-bold text-[#FFD23F] uppercase tracking-wider">PREFERENCES</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 scrollbar-hide space-y-6">
        {/* 用户信息 */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#FFF2DB] flex items-center justify-center text-3xl shadow-inner">
            {user.avatar}
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#2D2D2D]">{user.name}</h3>
            <p className="text-xs text-gray-400">Pro 用户 (有效期至 2025-12)</p>
          </div>
        </div>

        {/* 番茄钟设置入口 (Card Style) */}
        <div 
          onClick={() => setShowFocusModal(true)}
          className="bg-white rounded-[32px] p-6 shadow-sm active:scale-95 transition-transform cursor-pointer group"
        >
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFF2DB] flex items-center justify-center text-[#FFD23F]">
                   <Timer size={18} />
                </div>
                <h3 className="font-bold text-lg text-[#2D2D2D]">专注设置</h3>
            </div>
            <ChevronRight size={20} className="text-gray-300 group-hover:text-[#FFD23F] transition-colors" />
          </div>
          <p className="text-xs text-gray-400 pl-10">自定义番茄钟时长、休息时间及长休息周期</p>
        </div>

        {/* 数据操作 */}
        <div className="space-y-3">
           <button onClick={dataSystem.syncToCloud} className="w-full h-14 bg-white rounded-2xl flex items-center justify-between px-6 font-bold text-[#2D2D2D] active:scale-95 transition-transform border border-gray-100">
             <div className="flex items-center gap-3"><RefreshCw size={20} className={dataSystem.syncStatus === 'syncing' ? 'animate-spin text-[#42D4A4]' : 'text-gray-400'} /> 同步数据</div>
             {dataSystem.syncStatus === 'syncing' && <span className="text-xs text-[#42D4A4]">同步中...</span>}
           </button>
           <button className="w-full h-14 bg-white rounded-2xl flex items-center justify-between px-6 font-bold text-[#FF8CA1] active:scale-95 transition-transform border border-gray-100">
             <div className="flex items-center gap-3"><LogOut size={20} /> 退出登录</div>
           </button>
        </div>
      </div>

      {/* [NEW] Focus Settings Modal */}
      {showFocusModal && (
        <FocusSettingsModal 
           config={pomodoroConfig} 
           onClose={() => setShowFocusModal(false)} 
           onSave={setPomodoroConfig} 
        />
      )}
    </div>
  );
};

// [MODIFIED] OnboardingOverlay (移除最后一步蒙版)
const OnboardingOverlay = ({ onComplete, initialStep = 1 }) => {
  const [step, setStep] = useState(initialStep);

  const features = [
    { title: "计时器", icon: <Timer size={48} />, color: MACARON_COLORS.themes.timer, text: "通过计时器记录自己的一天，最后将进入数据分析" },
    { title: "日记", icon: <BookHeart size={48} />, color: MACARON_COLORS.themes.journal, text: "记录当下的心情和想法，这些数据将会进入深度分析" },
    { title: "复盘", icon: <PieChart size={48} />, color: MACARON_COLORS.themes.review, text: "全新AI复盘！支持回顾今天、昨天、本周或本月的记录。\n每天只要比昨天进步一点点。" },
    { title: "计划", icon: <Calendar size={48} />, color: MACARON_COLORS.themes.plan, text: "AI根据当下状态生成适合你的计划。\n你也可以手动补充想做的事情和时间。" },
  ];

  if (step === 1) {
    return (
      <div className="absolute inset-0 bg-[#FFFDF7] z-[100] flex flex-col items-center justify-center p-8 animate-fade-in text-center">
        <h1 className="text-4xl font-black text-[#2D2D2D] mb-4">欢迎</h1>
        <p className="text-gray-400 mb-8">开启你的专注之旅</p>
        <Button onClick={() => setStep(2)}>开始引导</Button>
      </div>
    );
  }

  // 修改：只展示 features 数组中的步骤 (2-5)，第 5 步点击后直接 onComplete
  if (step >= 2 && step <= 5) {
    const feature = features[step - 2];
    return (
      <div className="absolute inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-10 text-center animate-fade-in text-white">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.2)]" style={{ backgroundColor: feature.color }}>
          {feature.icon}
        </div>
        <h3 className="text-3xl font-black mb-4" style={{ color: feature.color }}>{feature.title}</h3>
        <p className="mb-10 text-lg leading-relaxed opacity-90 whitespace-pre-line">{feature.text}</p>
        <Button 
            onClick={() => {
                if (step === 5) {
                    onComplete(); // Last step, finish onboarding
                } else {
                    setStep(step + 1);
                }
            }} 
            style={{ backgroundColor: feature.color, borderColor: 'white', borderWidth: 2 }}
        >
          {step === 5 ? '进入应用' : '下一步'}
        </Button>
        <div className="flex gap-2 mt-8">
          {features.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step - 2 ? 'bg-white w-6' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>
    );
  }

  return null; // Should not reach here if logic is correct
};

// [MODIFIED] LoginView (包含开发者入口修复)
const LoginView = ({ loginLogic }) => {
  const { phone, setPhone, code, setCode, handleLogin, bypassLogin } = loginLogic;
  return (
    <div className="flex-1 flex flex-col px-8 pt-20 bg-white relative">
      <div className="mb-10"><h1 className="text-4xl font-black text-[#2D2D2D] mb-2">欢迎回来 👋</h1></div>
      <div className="space-y-6">
        <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="手机号" className="w-full bg-[#F9FAFB] border-2 border-[#F0F0F0] p-4 rounded-2xl outline-none" />
        <input value={code} onChange={e=>setCode(e.target.value)} placeholder="验证码" className="w-full bg-[#F9FAFB] border-2 border-[#F0F0F0] p-4 rounded-2xl outline-none" />
        <Button onClick={handleLogin}>进入</Button>
      </div>
      {/* [CRITICAL PROTECTION] 开发者免登录入口 - 严禁删除 */}
      {!IS_PROD && (
        <div onClick={bypassLogin} className="mt-auto pb-10 text-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
          <p className="text-[10px]" style={{ color: MACARON_COLORS.ui.textSecondary }}>⚡ Developer Mode (Click to Skip)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================================
   PART 3: 入口整合 (MAIN ENTRY)
   -----------------------------------------------------------------------------------------
   ========================================================================================= */

export default function App() {
  const [appState, setAppState] = useState('login'); 
  const [activeTab, setActiveTab] = useState('timer');
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  
  // [NEW] 新增状态：记录当前激活的分类颜色 (默认为蓝色)
  const [activeCategoryColor, setActiveCategoryColor] = useState(MACARON_COLORS.themes.timer);

  const timerSystem = useTimerSystem();
  const habitSystem = useHabitSystem();
  const journalSystem = useJournalSystem();
  const settingsSystem = useSettingsSystem();
  const dataSystem = useDataSystem(timerSystem.timers, timerSystem.setTimers, habitSystem.habits);
  
  const loginLogic = useLoginLogic(() => {
    const isFirstTime = true; 
    if(isFirstTime) { setAppState('onboarding'); setIsOnboarding(true); } else { setAppState('main'); }
  });
  const reviewLogic = useReviewLogic();
  const planLogic = usePlanLogic(timerSystem);

  const activeTimerObj = timerSystem.timers.find(t => t.id === timerSystem.activeTimerId);
  const showTopBar = activeTab !== 'timer' && activeTimerObj && activeTimerObj.status === 'running';

  const handleOnboardingComplete = () => { setIsOnboarding(false); setAppState('main'); };
  const openRatioSettings = () => { setOnboardingStep(2); setIsOnboarding(true); };

  // [DESIGN UPDATE] 底部导航栏多彩化 (修改为支持动态分类色)
  const getNavColor = (tabId) => {
    if (tabId === 'timer') {
        // 如果是 Timer Tab，返回当前激活的分类颜色
        return activeCategoryColor;
    }
    // 其他 Tab 返回默认配置的主题色
    switch(tabId) {
      case 'journal': return MACARON_COLORS.themes.journal;
      case 'review': return MACARON_COLORS.themes.review;
      case 'plan': return MACARON_COLORS.themes.plan;
      case 'settings': return MACARON_COLORS.themes.settings;
      default: return MACARON_COLORS.ui.primary;
    }
  };

  const renderMain = () => (
    <div className="flex-1 flex flex-col relative w-full overflow-hidden">
       {showTopBar && <TopTimerBar timer={activeTimerObj} onStop={() => timerSystem.pauseTimer(activeTimerObj.id)} />}
       <div className="flex-1 overflow-hidden h-full">
          {/* [MODIFIED] 将 setActiveCategoryColor 传给 TimerView */}
          {activeTab === 'timer' && (
            <TimerView 
              timerSystem={timerSystem} 
              onMinimize={() => setActiveTab('review')} 
              onCategoryChange={setActiveCategoryColor}
            />
          )}
          {activeTab === 'journal' && <JournalView journalSystem={journalSystem} timerSystem={timerSystem} />}
          {activeTab === 'review' && <ReviewView timerSystem={timerSystem} habitSystem={habitSystem} reviewLogic={reviewLogic} />}
          {activeTab === 'plan' && <PlanView timerSystem={timerSystem} planLogic={planLogic} />}
          {activeTab === 'settings' && <SettingsView settingsSystem={settingsSystem} dataSystem={dataSystem} habitSystem={habitSystem} onEditRatio={openRatioSettings} />}
       </div>
       <div className="absolute bottom-0 w-full h-[90px] bg-white/95 backdrop-blur-xl rounded-b-[45px] flex justify-between items-start pt-3 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-50 border-t border-white">
          {[
            { id: 'timer', icon: Timer, label: '专注' },
            { id: 'journal', icon: BookHeart, label: '日记' },
            { id: 'review', icon: PieChart, label: '复盘' },
            { id: 'plan', icon: Calendar, label: '计划' },
            { id: 'settings', icon: Settings2, label: '设置' },
          ].map((item) => {
            const isActive = activeTab === item.id;
            const activeColor = getNavColor(item.id);
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1.5 w-14 py-2 ${ANIMATIONS.spring} active:scale-90 group`}>
                {/* Modified: Removed translation logic so icon stays in place */}
                <div className="transition-all duration-300" style={{ color: isActive ? activeColor : '#C4C4C4' }}>
                  <item.icon size={28} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                {/* Modified: Always show text, color matches active state */}
                <span className="text-[10px] font-bold transition-colors duration-300" style={{ color: isActive ? activeColor : '#C4C4C4' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EBEBEB] flex items-center justify-center overflow-hidden font-sans select-none">
      <div 
        className="relative w-[430px] h-[932px] bg-[#FFFDF7] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15),0_0_0_10px_white] rounded-[55px] overflow-hidden flex flex-col border-8 border-gray-900/5 transition-colors duration-700"
        style={{ transform: 'scale(0.6)', transformOrigin: 'center center' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-b-[24px] z-[60]" />
        <StatusBar />
        {timerSystem.toastMsg && <Toast message={timerSystem.toastMsg} onClose={() => timerSystem.setToastMsg(null)} />}
        {isOnboarding && <OnboardingOverlay initialStep={onboardingStep} onComplete={handleOnboardingComplete} />}
        {appState === 'login' ? <LoginView loginLogic={loginLogic} /> : renderMain()}
        <div className="pointer-events-none absolute inset-0 rounded-[55px] ring-1 ring-black/5 z-[100]" />
      </div>
    </div>
  );
}
