import { useMemo, useRef, useState } from 'react';
import axios from 'axios';

const OBSTRUCTIONS = {
  water_tank: { label: 'Water tank', area: 8 },
  stairwell: { label: 'Stairwell', area: 12 },
  solar_water_heater: { label: 'Solar water heater', area: 3 },
};

const TYPE_FACTORS = {
  flat: 0.85,
  pitched: 0.45,
  mixed: 0.65,
};

export default function RooftopEstimator({ sessionId, onEstimated, initialValue }) {
  const [mode, setMode] = useState('direct');
  const [directValue, setDirectValue] = useState(initialValue ? String(initialValue) : '');

  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [roofType, setRoofType] = useState('flat');
  const [acCount, setAcCount] = useState(0);
  const [checks, setChecks] = useState({ water_tank: false, stairwell: false, solar_water_heater: false });

  const [imageUrl, setImageUrl] = useState(null);
  const [referenceLength, setReferenceLength] = useState('');
  const [points, setPoints] = useState([]);
  const imageRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const calculatorArea = useMemo(() => {
    const l = Number(length || 0);
    const w = Number(width || 0);
    const gross = l * w;
    const base = gross * TYPE_FACTORS[roofType];
    const obstructionBase = Object.entries(checks).reduce((acc, [key, enabled]) => {
      if (!enabled) return acc;
      return acc + OBSTRUCTIONS[key].area;
    }, 0);
    const acLoss = Math.min(Number(acCount || 0), 5) * 4;
    return Math.max(base - obstructionBase - acLoss, 0);
  }, [length, width, roofType, checks, acCount]);

  const selfMeasuredArea = useMemo(() => {
    if (points.length < 2 || !imageRef.current) return 0;
    const ref = Number(referenceLength || 0);
    if (!Number.isFinite(ref) || ref <= 0) return 0;

    const rect = imageRef.current.getBoundingClientRect();
    const [p1, p2] = points;
    const pixelWidth = Math.abs(p2.x - p1.x);
    const pixelHeight = Math.abs(p2.y - p1.y);
    if (!pixelWidth || !pixelHeight || !rect.width) return 0;

    const estimatedLength = (pixelWidth / rect.width) * ref;
    const estimatedWidth = estimatedLength * (pixelHeight / pixelWidth);
    return Math.max(estimatedLength * estimatedWidth, 0);
  }, [points, referenceLength]);

  const computedValue = mode === 'direct'
    ? Number(directValue || 0)
    : mode === 'calculator'
    ? calculatorArea
    : selfMeasuredArea;

  const methodLabel = mode === 'direct' ? 'direct' : mode === 'calculator' ? 'calculator' : 'self-measured';
  const confidenceLabel = mode === 'direct'
    ? 'Manually Specified'
    : mode === 'calculator'
    ? 'Calculated from Dimensions'
    : 'Self-Measured from Image';

  const saveAndContinue = async () => {
    const rooftopSqm = Number(computedValue);
    if (!Number.isFinite(rooftopSqm) || rooftopSqm <= 0) {
      setError('Please provide a valid rooftop area before continuing.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (sessionId) {
        await axios.post('/api/analyze-rooftop', {
          session_id: sessionId,
          rooftop_sqm: rooftopSqm,
          estimation_method: methodLabel,
        });
      }

      onEstimated({
        rooftop_sqm: Math.round(rooftopSqm * 10) / 10,
        estimation_method: methodLabel,
        confidence_label: confidenceLabel,
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save rooftop estimate.');
    } finally {
      setSaving(false);
    }
  };

  const onImageClick = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints((prev) => (prev.length >= 2 ? [{ x, y }] : [...prev, { x, y }]));
  };

  const onUploadImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setImageUrl(e.target.result);
    reader.readAsDataURL(file);
    setPoints([]);
  };

  return (
    <div className="glass-card p-6 space-y-5 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-white">Rooftop Area Estimator</h2>
      <p className="text-slate-400 text-sm">Choose one method to estimate usable rooftop area for solar panels.</p>

      <div className="flex flex-wrap gap-2">
        <button className={`btn-ghost ${mode === 'direct' ? '!text-solar-400' : ''}`} onClick={() => setMode('direct')}>Direct Entry</button>
        <button className={`btn-ghost ${mode === 'calculator' ? '!text-solar-400' : ''}`} onClick={() => setMode('calculator')}>Guided Calculator</button>
        <button className={`btn-ghost ${mode === 'self-measured' ? '!text-solar-400' : ''}`} onClick={() => setMode('self-measured')}>Self-Measured from Image</button>
      </div>

      {mode === 'direct' && (
        <div className="space-y-2">
          <label className="text-sm text-slate-300">I know my rooftop area (m2)</label>
          <input className="input-field" type="number" min="1" step="0.1" value={directValue} onChange={(e) => setDirectValue(e.target.value)} />
        </div>
      )}

      {mode === 'calculator' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input className="input-field" type="number" min="1" step="0.1" placeholder="Length (m)" value={length} onChange={(e) => setLength(e.target.value)} />
            <input className="input-field" type="number" min="1" step="0.1" placeholder="Width (m)" value={width} onChange={(e) => setWidth(e.target.value)} />
          </div>

          <select className="input-field" value={roofType} onChange={(e) => setRoofType(e.target.value)}>
            <option value="flat">Flat roof</option>
            <option value="pitched">Pitched roof</option>
            <option value="mixed">Mixed</option>
          </select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-300">
            {Object.entries(OBSTRUCTIONS).map(([key, spec]) => (
              <label key={key} className="flex items-center gap-2">
                <input type="checkbox" checked={checks[key]} onChange={(e) => setChecks((prev) => ({ ...prev, [key]: e.target.checked }))} />
                {spec.label} (-{spec.area} m2)
              </label>
            ))}
          </div>

          <div>
            <label className="text-sm text-slate-300">AC units count (max 5, each -4 m2)</label>
            <input className="input-field" type="number" min="0" max="5" value={acCount} onChange={(e) => setAcCount(e.target.value)} />
          </div>

          <p className="text-solar-400 font-semibold">Usable area: {calculatorArea.toFixed(1)} m2</p>
        </div>
      )}

      {mode === 'self-measured' && (
        <div className="space-y-3">
          <input type="file" accept="image/*" onChange={(e) => onUploadImage(e.target.files?.[0])} className="text-sm text-slate-300" />
          {imageUrl && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Click two opposite corners of your rooftop bounding box.</p>
              <div className="relative inline-block border border-white/10 rounded-xl overflow-hidden">
                <img ref={imageRef} src={imageUrl} alt="Rooftop" className="max-h-80" onClick={onImageClick} />
                {points.map((p, idx) => (
                  <span
                    key={idx}
                    className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-solar-400"
                    style={{ left: p.x, top: p.y }}
                  />
                ))}
              </div>
              <input
                className="input-field"
                type="number"
                min="1"
                step="0.1"
                placeholder="Approximate longest side length (m)"
                value={referenceLength}
                onChange={(e) => setReferenceLength(e.target.value)}
              />
              <p className="text-solar-400 font-semibold">User-estimated area: {selfMeasuredArea.toFixed(1)} m2</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs px-3 py-1 rounded-full bg-solar-400/10 text-solar-300 border border-solar-400/20">
          {confidenceLabel}
        </div>
        <button onClick={saveAndContinue} disabled={saving} className="btn-solar">
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
