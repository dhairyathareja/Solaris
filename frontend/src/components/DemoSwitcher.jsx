import axios from 'axios';

const OPTIONS = [
  { id: 'mumbai_office', label: 'Mumbai Office' },
  { id: 'jaipur_school', label: 'Jaipur School' },
  { id: 'bengaluru_hospital', label: 'Bengaluru Hospital' },
];

export default function DemoSwitcher({ onDemoLoaded, activeDemoId, setActiveDemoId }) {
  const loadDemo = async (id) => {
    setActiveDemoId(id);
    try {
      const res = await axios.get(`/api/demo/${id}`);
      onDemoLoaded(res.data);
    } catch {
      setActiveDemoId(null);
    }
  };

  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => loadDemo(opt.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              activeDemoId === opt.id
                ? 'bg-solar-400/20 border-solar-400/50 text-solar-300'
                : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-400/20">
        Demo Mode - Offline Capable
      </span>
    </div>
  );
}
