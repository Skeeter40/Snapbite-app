import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Home,
  BarChart3,
  Calendar,
  Flag,
  Camera,
  Pencil,
  Droplet,
  Plus,
  Minus,
  Star,
  Save,
  Check,
  X,
  FlaskConical,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { storage } from "./storage";
import PremiumButton from "./PremiumButton";
import AuthScreen from "./AuthScreen";
import ProgressPhotos from "./ProgressPhotos";
import { supabase } from "./supabaseClient";
const GREEN = "#10b981";
const GREEN_DARK = "#059669";
const GREEN_BG = "#ecfdf5";
const CARBS = "#f59e0b";
const FAT = "#ef4444";
const BG = "#f2f4f2";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, background: "white" }}>
          <p style={{ color: "red", fontWeight: "bold" }}>Error:</p>
          <p>{String(this.state.error.message || this.state.error)}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
const PRESETS = [
  { key: "lose", label: "Lose weight", calories: 1600, protein: 130, carbs: 150, fat: 55 },
  { key: "maintain", label: "Maintain", calories: 2000, protein: 120, carbs: 220, fat: 65 },
  { key: "build", label: "Build muscle", calories: 2600, protein: 170, carbs: 280, fat: 80 },
];

const DEFAULT_GOALS = { calories: 2000, protein: 120, carbs: 220, fat: 65, water: 2000 };

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function fmtLong(d) {
  return `${WEEKDAY_LONG[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// ---------- storage helpers ----------

async function loadGoals() {
  try {
    const res = await storage.get("goals");
    return res ? JSON.parse(res.value) : DEFAULT_GOALS;
  } catch {
    return DEFAULT_GOALS;
  }
}

async function saveGoals(goals) {
  try {
    await storage.set("goals", JSON.stringify(goals));
  } catch {
    // best effort
  }
}

async function loadDay(key) {
  try {
    const res = await storage.get(`day:${key}`);
    return res ? JSON.parse(res.value) : { water: 0, meals: [] };
  } catch {
    return { water: 0, meals: [] };
  }
}

async function saveDay(key, data) {
  try {
    await storage.set(`day:${key}`, JSON.stringify(data));
  } catch {
    // best effort
  }
}

// ---------- small UI pieces ----------

function RingProgress({ value, goal, size = 176, stroke = 14 }) {
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const remaining = Math.max(0, goal - value);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={GREEN}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-extrabold text-gray-900 tabular-nums">{remaining}</div>
        <div className="text-sm font-semibold" style={{ color: GREEN }}>
          kcal left
        </div>
        <div className="text-xs text-gray-400 mt-0.5 tabular-nums">
          {value} / {goal}
        </div>
      </div>
    </div>
  );
}

function MacroBar({ label, value, goal, color }) {
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-900 font-semibold tabular-nums">
          {value} <span className="text-gray-400 font-normal">/ {goal}g</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, backgroundColor: color, transition: "width 0.3s ease" }}
        />
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle, actionLabel, onAction }) {
  return (
    <div className="bg-white rounded-2xl p-8 flex flex-col items-center text-center border border-gray-100">
      <div className="w-20 h-20 rounded-full bg-gray-100 mb-4" />
      <div className="font-bold text-gray-900 text-lg">{title}</div>
      <div className="text-gray-400 text-sm mt-1 mb-5 max-w-[220px]">{subtitle}</div>
      {actionLabel && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-full"
          style={{ backgroundColor: GREEN }}
        >
          <Pencil size={18} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function MealRow({ meal }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-gray-100">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <span className="text-lg">🍽️</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 truncate">{meal.name}</div>
        <div className="text-xs text-gray-400">
          P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g
        </div>
      </div>
      <div className="font-bold text-gray-900 tabular-nums shrink-0">{meal.calories} kcal</div>
    </div>
  );
}

// ---------- add meal modal ----------

function AddMealModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });

  useEffect(() => {
    if (open) setForm({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  }, [open]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim().length > 0 && Number(form.calories) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-gray-900">Log a meal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-5">
          Automatic photo recognition needs a backend model — enter the details and I'll log it.
        </p>

        <label className="block text-xs font-semibold text-gray-500 mb-1">Meal name</label>
        <input
          value={form.name}
          onChange={set("name")}
          placeholder="Grilled chicken bowl"
          className="w-full bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900 outline-none focus:ring-2"
          style={{ "--tw-ring-color": GREEN }}
        />

        <label className="block text-xs font-semibold text-gray-500 mb-1">Calories (kcal)</label>
        <input
          type="number"
          inputMode="numeric"
          value={form.calories}
          onChange={set("calories")}
          placeholder="450"
          className="w-full bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900 outline-none"
        />

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            ["protein", "Protein (g)"],
            ["carbs", "Carbs (g)"],
            ["fat", "Fat (g)"],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
              <input
                type="number"
                inputMode="numeric"
                value={form[k]}
                onChange={set(k)}
                placeholder="0"
                className="w-full bg-gray-50 rounded-xl px-3 py-3 text-gray-900 outline-none"
              />
            </div>
          ))}
        </div>

        <button
          disabled={!valid}
          onClick={() =>
            onAdd({
              id: `${Date.now()}`,
              name: form.name.trim(),
              calories: Number(form.calories) || 0,
              protein: Number(form.protein) || 0,
              carbs: Number(form.carbs) || 0,
              fat: Number(form.fat) || 0,
            })
          }
          className="w-full py-4 rounded-2xl font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: GREEN }}
        >
          Add meal
        </button>
      </div>
    </div>
  );
}

// ---------- screens ----------

function TodayScreen({ today, goals, dayData, onWaterChange, onOpenAdd }) {
  const consumed = dayData.meals.reduce((s, m) => s + m.calories, 0);
  const protein = dayData.meals.reduce((s, m) => s + m.protein, 0);
  const carbs = dayData.meals.reduce((s, m) => s + m.carbs, 0);
  const fat = dayData.meals.reduce((s, m) => s + m.fat, 0);
  const waterL = dayData.water / 1000;
  const goalL = goals.water / 1000;
  const drops = 8;
  const filledDrops = Math.round((dayData.water / goals.water) * drops);

  return (
    <div className="px-5 pb-28 pt-2">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-semibold" style={{ color: GREEN }}>
            {fmtLong(today)}
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Today's Summary</h1>
        </div>
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: GREEN }}>
          <Star size={20} className="text-white" fill="white" />
        </div>
      </div>

      <div className="rounded-3xl p-5 mb-5" style={{ backgroundColor: GREEN_BG }}>
        <div className="flex items-center gap-5">
          <RingProgress value={consumed} goal={goals.calories} />
          <div className="flex-1">
            <MacroBar label="Protein" value={protein} goal={goals.protein} color={GREEN} />
            <MacroBar label="Carbs" value={carbs} goal={goals.carbs} color={CARBS} />
            <MacroBar label="Fat" value={fat} goal={goals.fat} color={FAT} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 mb-5 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: GREEN_BG }}>
              <Droplet size={18} style={{ color: GREEN }} fill={GREEN} />
            </div>
            <div>
              <div className="font-bold text-gray-900">Water</div>
              <div className="text-xs text-gray-400 tabular-nums">
                {waterL.toFixed(2)} L of {goalL.toFixed(1)} L
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onWaterChange(-250)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-50 text-gray-500"
            >
              <Minus size={16} />
            </button>
            <button
              onClick={() => onWaterChange(250)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: GREEN }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 mb-3">
          {Array.from({ length: drops }).map((_, i) => (
            <Droplet
              key={i}
              size={20}
              style={{ color: i < filledDrops ? GREEN : "#e5e7eb" }}
              fill={i < filledDrops ? GREEN : "none"}
            />
          ))}
        </div>
        <button
          onClick={() => onWaterChange(500)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ backgroundColor: GREEN_BG, color: GREEN_DARK }}
        >
          <FlaskConical size={14} />
          +500 ml
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-extrabold text-gray-900">Today's Log</h2>
        <span className="text-gray-400 text-sm">{dayData.meals.length} meals</span>
      </div>

      {dayData.meals.length === 0 ? (
        <EmptyState
          title="No meals yet"
          subtitle="Log your food to track it here."
          actionLabel="Log your first meal"
          onAction={onOpenAdd}
        />
      ) : (
        <div className="space-y-2">
          {dayData.meals.map((m) => (
            <MealRow key={m.id} meal={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrendsScreen({ weekData, goals, onOpenProgressPhotos }) {
  const hasData = weekData.some((d) => d.calories > 0);
  return (
    <div className="px-5 pb-28 pt-2">
      <h1 className="text-3xl font-extrabold text-gray-900">Trends</h1>
      <p className="text-gray-400 mb-5">Your last 7 days</p>

      {!hasData ? (
        <EmptyState
          title="No data yet"
          subtitle="Log meals for a few days and your weekly trends will appear here."
        />
      ) : (
        <div className="bg-white rounded-2xl p-4 mb-5 border border-gray-100" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
              <Tooltip cursor={{ fill: "#f9fafb" }} />
              <ReferenceLine y={goals.calories} stroke="#d1d5db" strokeDasharray="4 4" />
              <Bar dataKey="calories" radius={[6, 6, 0, 0]} fill={GREEN} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div
  onClick={onOpenProgressPhotos}
  className="bg-white rounded-2xl p-4 flex items-center justify-between border border-gray-100 cursor-pointer"
>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: GREEN }}>
            <Camera size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-900">Progress Photos</div>
            <div className="text-xs text-gray-400">Track your before &amp; after transformation</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryScreen({ days, selected, onSelect, dayData, onOpenAdd }) {
  const total = dayData.meals.reduce((s, m) => s + m.calories, 0);
  return (
    <div className="px-5 pb-28 pt-2">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-4">History</h1>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-5 px-5">
        {days.map((d) => {
          const key = dateKey(d);
          const isSel = key === dateKey(selected);
          return (
            <button
              key={key}
              onClick={() => onSelect(d)}
              className="shrink-0 w-16 py-3 rounded-2xl text-center"
              style={{
                backgroundColor: isSel ? GREEN : "#f5f5f5",
                color: isSel ? "white" : "#374151",
              }}
            >
              <div className="text-xs font-medium opacity-80">{WEEKDAY_SHORT[d.getDay()]}</div>
              <div className="text-lg font-bold">{d.getDate()}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl p-5 text-center mb-5" style={{ backgroundColor: GREEN_BG }}>
        <div className="font-semibold mb-1" style={{ color: GREEN_DARK }}>
          {fmtLong(selected)}
        </div>
        <div className="text-4xl font-extrabold text-gray-900 tabular-nums">
          {total} <span className="text-lg font-semibold text-gray-500">kcal</span>
        </div>
      </div>

      {dayData.meals.length === 0 ? (
        <>
          <EmptyState title="No meals logged" subtitle="Nothing recorded for this date." />
          <button
            onClick={onOpenAdd}
            className="w-full mt-4 py-4 rounded-2xl border-2 border-dashed font-semibold flex items-center justify-center gap-2"
            style={{ borderColor: GREEN, color: GREEN }}
          >
            <Plus size={18} /> Add a meal
          </button>
        </>
      ) : (
        <div className="space-y-2">
          {dayData.meals.map((m) => (
            <MealRow key={m.id} meal={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalsScreen({ goals, onSave }) {
  const [form, setForm] = useState(goals);
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm(goals), [goals]);

  const applyPreset = (p) => {
    setForm({ ...form, calories: p.calories, protein: p.protein, carbs: p.carbs, fat: p.fat });
    setSaved(false);
  };

  const field = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: Number(e.target.value) || 0 }));
    setSaved(false);
  };

  const activePreset = PRESETS.find((p) => p.calories === form.calories);

  const handleSave = () => {
    onSave(form);
    setSaved(true);
  };

  const rows = [
    { key: "calories", label: "Daily Calories", unit: "kcal", color: GREEN },
    { key: "protein", label: "Protein", unit: "g", color: GREEN },
    { key: "carbs", label: "Carbs", unit: "g", color: CARBS },
    { key: "fat", label: "Fat", unit: "g", color: FAT },
    { key: "water", label: "Water", unit: "ml", color: GREEN_DARK },
  ];

  return (
    <div className="px-5 pb-28 pt-2">
      <h1 className="text-3xl font-extrabold text-gray-900">Goals</h1>
      <p className="text-gray-400 mb-6">Set your daily nutrition targets</p>

      <h3 className="font-bold text-gray-800 mb-3">Quick presets</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 mb-6 -mx-5 px-5">
        {PRESETS.map((p) => {
          const active = activePreset?.key === p.key;
          return (
            <button
              key={p.key}
              onClick={() => applyPreset(p)}
              className="shrink-0 rounded-2xl px-5 py-4 text-left"
              style={{
                backgroundColor: active ? GREEN : GREEN_BG,
                minWidth: 140,
              }}
            >
              <div className="font-bold" style={{ color: active ? "white" : GREEN_DARK }}>
                {p.label}
              </div>
              <div className="text-sm" style={{ color: active ? "#d1fae5" : GREEN }}>
                {p.calories} kcal
              </div>
            </button>
          );
        })}
      </div>

      <h3 className="font-bold text-gray-800 mb-3">Custom targets</h3>
      <div className="space-y-3 mb-6">
        {rows.map((r) => (
          <div key={r.key} className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-gray-100">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
            <span className="font-semibold text-gray-800 w-28 shrink-0">{r.label}</span>
            <div className="flex-1 bg-gray-50 rounded-xl flex items-center justify-end px-4 py-3">
              <input
                type="number"
                inputMode="numeric"
                value={form[r.key]}
                onChange={field(r.key)}
                className="bg-transparent text-right font-bold text-gray-900 outline-none w-24"
              />
              <span className="text-gray-400 ml-1 text-sm">{r.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
        style={{ backgroundColor: GREEN }}
      >
        {saved ? (
          <>
            <Check size={20} /> Goals Saved
          </>
        ) : (
          <>
            <Save size={18} /> Save Goals
          </>
        )}
      </button>
    </div>
  );
}

// ---------- app shell ----------

const TABS = [
  { key: "today", label: "Today", icon: Home },
  { key: "trends", label: "Trends", icon: BarChart3 },
  { key: "history", label: "History", icon: Calendar },
  { key: "goals", label: "Goals", icon: Flag },
];

export default function SnapBiteApp() {
  const today = useMemo(() => new Date(), []);
  const [tab, setTab] = useState("today");
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [selectedDate, setSelectedDate] = useState(today);
  const [dayCache, setDayCache] = useState({});
  const [weekData, setWeekData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [showProgressPhotos, setShowProgressPhotos] = useState(false);
  const [loading, setLoading] = useState(true);

  const last7 = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(today, -6 + i)).reverse(), [today]);

  const ensureDay = useCallback(async (d) => {
    const key = dateKey(d);
    setDayCache((prev) => {
      if (prev[key]) return prev;
      return prev;
    });
    const data = await loadDay(key);
    setDayCache((prev) => ({ ...prev, [key]: data }));
    return data;
  }, []);

  useEffect(() => {
    (async () => {
      const g = await loadGoals();
      setGoals(g);
      await ensureDay(today);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ensureDay(selectedDate);
  }, [selectedDate, ensureDay]);

  // build trends data once we have goals + cache updates
  useEffect(() => {
    (async () => {
      const rows = [];
      for (const d of last7) {
        const data = await loadDay(dateKey(d));
        rows.push({
          day: WEEKDAY_SHORT[d.getDay()],
          calories: data.meals.reduce((s, m) => s + m.calories, 0),
        });
      }
      setWeekData(rows);
    })();
  }, [last7, dayCache]);

  const todayKey = dateKey(today);
  const selectedKey = dateKey(selectedDate);
  const todayData = dayCache[todayKey] || { water: 0, meals: [] };
  const selectedData = dayCache[selectedKey] || { water: 0, meals: [] };

  const persistDay = async (key, data) => {
    setDayCache((prev) => ({ ...prev, [key]: data }));
    await saveDay(key, data);
  };

  const handleWaterChange = async (delta) => {
    const cur = dayCache[todayKey] || { water: 0, meals: [] };
    const next = { ...cur, water: Math.max(0, cur.water + delta) };
    await persistDay(todayKey, next);
  };

  const handleAddMeal = async (meal) => {
    const targetKey = tab === "history" ? selectedKey : todayKey;
    const cur = dayCache[targetKey] || { water: 0, meals: [] };
    const next = { ...cur, meals: [meal, ...cur.meals] };
    await persistDay(targetKey, next);
    setModalOpen(false);
  };

  const handleSaveGoals = async (g) => {
    setGoals(g);
    await saveGoals(g);
  };
const [session, setSession] = useState(null);
const [authLoading, setAuthLoading] = useState(true);

useEffect(() => {
  const timeout = setTimeout(() => setAuthLoading(false), 8000);

  supabase.auth.getSession().then(({ data }) => {
    clearTimeout(timeout);
    setSession(data.session);
    setAuthLoading(false);
  }).catch(() => {
    clearTimeout(timeout);
    setAuthLoading(false);
  });

  const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
    setSession(newSession);
  });
  return () => {
    clearTimeout(timeout);
    listener.subscription.unsubscribe();
  };
}, []);

if (authLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
      <div className="text-gray-400 text-sm">Loading…</div>
    </div>
  );
}
if (!session) return <AuthScreen />;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      <div className="max-w-md mx-auto min-h-screen bg-[#f2f4f2] relative">
        {tab === "today" && (
          <TodayScreen
            today={today}
            goals={goals}
            dayData={todayData}
            onWaterChange={handleWaterChange}
            onOpenAdd={() => setModalOpen(true)}
          />
        )}
        {tab === "trends" && <ErrorBoundary><TrendsScreen weekData={weekData} goals={goals} /></ErrorBoundary>}
        {tab === "history" && (
          <HistoryScreen
            days={last7}
            selected={selectedDate}
            onSelect={setSelectedDate}
            dayData={selectedData}
            onOpenAdd={() => setModalOpen(true)}
          />
        )}
        {tab === "goals" && <GoalsScreen goals={goals} onSave={handleSaveGoals} />}

        {/* floating camera button on Today tab */}
        {tab === "today" && todayData.meals.length > 0 && (
          <button
            onClick={() => setModalOpen(true)}
            className="fixed bottom-24 right-1/2 translate-x-[150px] sm:translate-x-[178px] w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
            style={{ backgroundColor: GREEN }}
          >
            <Pencil size={22} />
          </button>
        )}
        <div className="fixed bottom-0 left-0 right-0">
        <PremiumButton />
          <div className="max-w-md mx-auto bg-white border-t border-gray-100 flex items-center justify-around py-2.5 px-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="flex flex-col items-center gap-1 px-3 py-1"
                >
                  <Icon size={22} style={{ color: active ? GREEN : "#9ca3af" }} strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[11px] font-medium" style={{ color: active ? GREEN : "#9ca3af" }}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <AddMealModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAddMeal} />
      </div>
    </div>
  );
}
