import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookMarked,
  BookOpen,
  Bug,
  Calculator,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Cloud,
  Compass,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  HeartPulse,
  Image as ImageIcon,
  Info,
  Layers,
  Lock,
  LogOut,
  MessageSquarePlus,
  Moon,
  Package,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  Trash2,
  Upload,
  Wrench,
  X,
  Zap
} from 'lucide-react';

// ==========================================
// FIREBASE CLOUD CONFIG (PASTE YOUR API KEY / DOMAIN HERE)
// ==========================================
const PASTE_YOUR_FIREBASE_CONFIG_HERE = { 
  apiKey: "AIzaSyCJr5EtomUlvIQiqyOXw7jG7K9W4bUulgk",
  authDomain: "paedtrach-oncall.firebaseapp.com",
  projectId: "paedtrach-oncall",
  storageBucket: "paedtrach-oncall.firebasestorage.app",
  messagingSenderId: "928358075073",
  appId: "1:928358075073:web:82b4cc602d749a32406240"
};

let firebaseApp = null;
let auth = null;
let db = null;

try {
  if (PASTE_YOUR_FIREBASE_CONFIG_HERE && PASTE_YOUR_FIREBASE_CONFIG_HERE.apiKey) {
    firebaseApp = initializeApp(PASTE_YOUR_FIREBASE_CONFIG_HERE);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
  }
} catch (err) {
  console.warn('Firebase running in offline localStorage mode:', err);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'paedtrach-oncall-pwa';

// ==========================================
// INITIAL CLINICAL DATA (NTSP / DAS / NHS)
// ==========================================

const SUCTION_SIZING_TABLE = [
  { id: '2.5', catFr: '5 Fr', depthCm: '5.5 – 6.0 cm', downsize: '2.0 mm', ageGuide: 'Preterm Infant' },
  { id: '3.0', catFr: '6 Fr', depthCm: '6.0 – 6.5 cm', downsize: '2.5 mm', ageGuide: 'Neonate (< 3 kg)' },
  { id: '3.5', catFr: '7 Fr', depthCm: '6.5 – 7.5 cm', downsize: '3.0 mm', ageGuide: '0 – 6 Months' },
  { id: '4.0', catFr: '8 Fr', depthCm: '7.5 – 8.5 cm', downsize: '3.5 mm', ageGuide: '6 – 18 Months' },
  { id: '4.5', catFr: '8 – 10 Fr', depthCm: '8.5 – 9.5 cm', downsize: '4.0 mm', ageGuide: '1.5 – 3 Years' },
  { id: '5.0', catFr: '10 Fr', depthCm: '9.5 – 10.5 cm', downsize: '4.5 mm', ageGuide: '3 – 6 Years' },
  { id: '5.5', catFr: '10 – 12 Fr', depthCm: '10.5 – 11.5 cm', downsize: '5.0 mm', ageGuide: '6 – 9 Years' },
  { id: '6.0', catFr: '12 Fr', depthCm: '11.5 – 12.5 cm', downsize: '5.5 mm', ageGuide: '9 – 12 Years' },
  { id: '6.5', catFr: '12 – 14 Fr', depthCm: '12.5 – 13.5 cm', downsize: '6.0 mm', ageGuide: '12 – 14 Years' },
  { id: '7.0', catFr: '14 Fr', depthCm: '13.5 – 14.5 cm', downsize: '6.5 mm', ageGuide: 'Adolescent' }
];

const EMERGENCY_BAG_CHECKLIST = [
  { id: 'eq-1', label: 'Spare Tracheostomy Tube (Same size + Obturator)' },
  { id: 'eq-2', label: 'Downsized Tracheostomy Tube (0.5 mm smaller + Obturator)' },
  { id: 'eq-3', label: 'Correct-size flexible Suction Catheters & Portable Suction Unit' },
  { id: 'eq-4', label: 'Round-ended blunt scissors (for cutting neck ties safely)' },
  { id: 'eq-5', label: 'Water-soluble lubricant sachets' },
  { id: 'eq-6', label: 'Spare Velcro or cotton neck ties' },
  { id: 'eq-7', label: '10 ml Syringe (if cuffed tube present — sterile water for Bivona TTS)' },
  { id: 'eq-8', label: 'Paediatric BVM + Neonatal mask (for direct stoma ventilation)' },
  { id: 'eq-9', label: 'Sterile gauze swabs (to occlude stoma for oral ventilation)' }
];

const getPathwayThemeStyles = (theme) => {
  if (theme === 'green') {
    return {
      topBar: 'border-t-4 border-t-emerald-500',
      pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      cardHover: 'hover:border-emerald-300'
    };
  }
  if (theme === 'red') {
    return {
      topBar: 'border-t-4 border-t-rose-500',
      pill: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
      cardHover: 'hover:border-rose-300'
    };
  }
  if (theme === 'blue') {
    return {
      topBar: 'border-t-4 border-t-sky-500',
      pill: 'bg-sky-50 text-sky-700 border-sky-200',
      dot: 'bg-sky-500',
      cardHover: 'hover:border-sky-300'
    };
  }
  if (theme === 'amber') {
    return {
      topBar: 'border-t-4 border-t-amber-500',
      pill: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-500',
      cardHover: 'hover:border-amber-300'
    };
  }
  return {
    topBar: 'border-t-4 border-t-slate-600',
    pill: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-600',
    cardHover: 'hover:border-slate-300'
  };
};

const INITIAL_PATHWAYS = [
  {
    id: 'ntsp-emergency',
    title: 'Tracheostomy Emergency',
    category: 'NTSP Green Pathway',
    placement: 'core',
    theme: 'green',
    urgency: 'critical',
    featured: true,
    summary:
      'Patent upper airway — mouth & nose connect to lungs. Immediate structured NTSP algorithm for distress, hypoxia, or apnoea.',
    steps: [
      {
        id: 'ntsp-1',
        title: 'Call for Help & Assess Patency',
        action:
          'Call 999 / Paediatric Airway Team. Apply high-flow O2 to BOTH the tracheostomy AND the face/mouth simultaneously.',
        details:
          'Look, listen, and feel for airflow at the tracheostomy AND mouth/nose. Attach waveform capnography (EtCO2) immediately—absent waveform indicates obstruction or displacement.',
        redFlag:
          'Never assume a silent stoma is patent. Check for a cap, speaking valve (e.g. Passy-Muir), or blocked HME.'
      },
      {
        id: 'ntsp-2',
        title: 'Remove Attachments & Check Inner Cannula',
        action:
          'Remove any speaking valve, cap, Swedish nose (HME), or humidification filter immediately.',
        details:
          'Most paediatric tracheostomy tubes (Shiley/Bivona) do NOT have an inner cannula. If an adolescent tube has an inner cannula, remove and inspect/replace it.',
        redFlag: 'Never inflate a cuff with a speaking valve attached.'
      },
      {
        id: 'ntsp-3',
        title: 'Pass a Suction Catheter (Patency Test)',
        action:
          'Attempt to pass a pre-measured suction catheter down the tracheostomy tube.',
        details:
          'If the catheter passes smoothly, the tube is patent: suction gently, oxygenate, and consider non-obstructive causes (pneumothorax, sepsis, bronchospasm). If it CANNOT pass, the tube is blocked or displaced.',
        redFlag: 'Do NOT force a suction catheter against firm resistance.'
      },
      {
        id: 'ntsp-4',
        title: 'Deflate Cuff (if present) & Emergency Tube Change',
        action:
          'If catheter fails to pass: deflate cuff (Bivona TTS uses sterile water; Shiley uses air). Remove the blocked/displaced tube.',
        details:
          'Insert the SAME SIZE spare tracheostomy tube from the emergency go-bag (lubricated, with obturator in place). Remove obturator immediately and check EtCO2/chest rise.',
        redFlag:
          'If same size meets resistance, immediately step down to the 0.5 mm SMALLER spare tube. Maximum 2 attempts.'
      },
      {
        id: 'ntsp-5',
        title: 'Secondary Emergency Oxygenation (Upper Airway / Stoma)',
        action:
          'If tube cannot be replaced and child is deteriorating: cover the stoma with gloved finger/gauze and bag-valve-mask ventilate via MOUTH/NOSE (unless laryngectomy/upper airway stenosis).',
        details:
          'Alternatively, apply a paediatric circular mask or LMA directly over the stoma. Prepare for oral intubation or advancing a smaller ETT/tracheostomy tube over a suction catheter/bougie.',
        redFlag:
          'Always verify if the child has a patent upper airway (check bedside Green/Red bedhead sign).'
      }
    ]
  },
  {
    id: 'ntsp-red',
    title: 'Laryngectomy / Stoma-Only Emergency',
    category: 'NTSP Red Pathway',
    placement: 'core',
    theme: 'red',
    urgency: 'critical',
    summary:
      'No upper airway connection — oxygenate and ventilate via the neck stoma ONLY. Never occlude the stoma.',
    steps: [
      {
        id: 'red-1',
        title: 'Confirm Red Bedhead Sign & Apply Stoma Oxygen',
        action:
          'Apply high-flow O2 directly over the neck stoma/tube. Remove any speaking valve, cap, or HME filter immediately.',
        details:
          'All assessment, oxygenation, and ventilation must take place via the neck stoma. Do NOT attempt oral oxygenation or oral intubation.',
        redFlag: 'NEVER occlude the stoma in a Red Pathway patient — it is their only airway.'
      },
      {
        id: 'red-2',
        title: 'Assess Patency & Suction via Neck Tube',
        action:
          'Pass a flexible pre-measured suction catheter through the tube to rule out blockage or displacement.',
        details:
          'If patent, suction secretions and ventilate via the 15 mm tracheostomy hub with waveform EtCO2 monitoring.',
        redFlag: 'Never force a suction catheter against firm resistance.'
      },
      {
        id: 'red-3',
        title: 'Remove Blocked Tube & Ventilate Stoma Directly',
        action:
          'If blocked: deflate cuff (if present), remove the tube, and attempt replacement with same-size or 0.5 mm downsize spare tube.',
        details:
          'If unable to replace, seal a circular neonatal mask or paediatric LMA/i-gel directly over the open neck stoma to ventilate.',
        redFlag: 'Maintain neutral neck alignment so skin folds do not obstruct the open stoma.'
      }
    ]
  },
  {
    id: 'paed-bls-mod',
    title: 'Paediatric Tracheostomy BLS',
    category: 'Modified Resuscitation',
    placement: 'core',
    theme: 'blue',
    urgency: 'critical',
    summary:
      'Modified resuscitation sequence for bradycardia (HR < 60 bpm) or hypoxic cardiac arrest in a child with a tracheostomy.',
    steps: [
      {
        id: 'bls-1',
        title: 'Strip Attachments & Deliver 5 Rescue Breaths',
        action:
          'Remove speaking valve, cap, or HME filter immediately. Deliver 5 rescue breaths via the tracheostomy hub and watch for chest rise.',
        details:
          'Paediatric arrest in tracheostomy patients is almost always hypoxic. If the chest fails to rise on the first 2 breaths, assume the tube is blocked or displaced and remove it immediately.',
        redFlag: 'Clearing an obstructed tracheostomy takes top priority.'
      },
      {
        id: 'bls-2',
        title: 'Start 15:2 Chest Compressions (HR < 60 bpm)',
        action:
          'If no signs of life or HR < 60 bpm with poor perfusion, start chest compressions at 100–120/min (15 compressions : 2 breaths).',
        details:
          'Attach defibrillator pads, establish IV/IO access, and follow Paediatric ALS guidance (Adrenaline 10 mcg/kg every 3–5 mins).',
        redFlag: 'Verify square-wave EtCO2 and check for surgical emphysema if high resistance occurs.'
      }
    ]
  },
  {
    id: 'accidental-decannulation',
    title: 'Accidental Decannulation & Tight Stoma',
    category: 'Airway Emergency',
    placement: 'extra',
    theme: 'amber',
    urgency: 'critical',
    summary:
      'Stepwise management when a tracheostomy tube falls out or is pulled out, including maturation stay sutures and downsizing.',
    steps: [
      {
        id: 'decann-1',
        title: 'Position Neck & Apply Oxygen',
        action:
          'Place a small rolled towel under the shoulders to gently extend the neck. Apply high-flow O2 over the stoma AND face.',
        details:
          'Assess breathing and SpO2. Check if the tracheostomy is fresh (<7 days old) or mature (>7 days). Look for labelled "Left" and "Right" stay sutures taped to the chest.',
        redFlag:
          'Fresh stomas (<7 days) close rapidly and carry a very high risk of pre-tracheal false passage.'
      },
      {
        id: 'decann-2',
        title: 'Insert Same-Size Spare Tube (With Obturator)',
        action:
          'Lubricate the same-size spare tube with obturator in place. If stay sutures are present, gently pull them upward and laterally to bring the trachea to the surface.',
        details:
          'Guide the tube gently posteriorly into the stoma, then follow the natural downward curve of the trachea. Withdraw the obturator immediately and verify EtCO2.',
        redFlag: 'Never force a tube against resistance.'
      },
      {
        id: 'decann-3',
        title: 'Downsize by 0.5 mm or Use Suction Catheter Seldinger Guide',
        action:
          'If the same-size tube will not pass, immediately attempt the 0.5 mm smaller spare tube (or a small ETT).',
        details:
          'If still tight, pass a soft suction catheter through the stoma into the trachea as a guidewire and railroad the downsized tube over it, then remove the catheter.',
        redFlag:
          'If flat EtCO2 or neck crepitus occurs, suspect a false passage—remove the tube immediately and oxygenate via upper airway or stoma mask.'
      }
    ]
  },
  {
    id: 'blocked-tube',
    title: 'Blocked Tube / Thick Mucus Plugging',
    category: 'Airway Obstruction',
    placement: 'extra',
    theme: 'amber',
    urgency: 'critical',
    summary:
      'Rapid recognition and clearance of partial or complete mucus plugging without delaying emergency tube exchange.',
    steps: [
      {
        id: 'plug-1',
        title: 'Remove HME / Speaking Valve & Check Airflow',
        action:
          'Immediately strip off any HME filter, Swedish nose, or Passy-Muir valve—secretions rapidly clog these attachments.',
        details:
          'Listen for harsh whistling, silent chest, or rising peak pressures. Apply 100% O2 to both stoma and mouth.',
        redFlag: 'Do not waste time nebulising a completely obstructed tube.'
      },
      {
        id: 'plug-2',
        title: 'Pre-Measured Suction Attempt',
        action:
          'Pass a pre-measured suction catheter to the known tube depth and apply suction on withdrawal only.',
        details:
          'If the catheter passes freely and clears a thick plug, re-assess SpO2, work of breathing, and EtCO2. Consider humidified O2 once stable.',
        redFlag:
          'If the catheter hits a hard stop and cannot pass, treat as a complete blockage—move immediately to emergency tube change.'
      },
      {
        id: 'plug-3',
        title: 'Deflate Cuff & Swap Tube',
        action:
          'Deflate cuff (sterile water for Bivona TTS; air for Shiley), remove the blocked tube, and insert the lubricated spare tube.',
        details:
          'Confirm square-wave capnography and bilateral chest rise, then secure ties snugly (one finger space between tie and neck).',
        redFlag: 'Always inspect the removed tube to confirm the mucus plug was cleared.'
      }
    ]
  },
  {
    id: 'trache-bleed',
    title: 'Tracheostomy Haemorrhage / Sentinel Bleed',
    category: 'Vascular Emergency',
    placement: 'extra',
    theme: 'red',
    urgency: 'critical',
    summary:
      'Management of minor granulation bleeding vs. catastrophic tracheo-innominate artery fistula (TIF) haemorrhage.',
    steps: [
      {
        id: 'bleed-1',
        title: 'Assess Volume & Pulsatility',
        action:
          'Distinguish minor blood-streaked secretions from brisk, bright-red pulsatile haemorrhage (>10 mL or sentinel bleed).',
        details:
          'Any brisk bleeding from a tracheostomy 3 days to 6 weeks post-insertion must be treated as a potential tracheo-innominate fistula until proven otherwise by ENT.',
        redFlag:
          'A small "sentinel bleed" can precede catastrophic exsanguination within hours—ALL patients require urgent ENT review in A&E.'
      },
      {
        id: 'bleed-2',
        title: 'Do NOT Remove Tube Blindly — Over-Inflate Cuff',
        action:
          'If massive pulsatile bleeding occurs and a cuffed tube is in situ, over-inflate the cuff with air/water to tamponade the bleeding vessel.',
        details:
          'Apply gentle anterior traction on the tracheostomy tube against the sternum. Suction airway gently to maintain oxygenation and alert ENT / Cardiothoracic surgery immediately.',
        redFlag: 'Avoid aggressive deep suctioning which can dislodge a life-saving clot.'
      },
      {
        id: 'bleed-3',
        title: 'Utley Manoeuvre (Last Resort)',
        action:
          'If bleeding continues despite cuff hyperinflation and oral intubation is secured, insert a gloved finger into the stoma and compress the innominate artery anteriorly against the posterior sternum.',
        details:
          'Maintain continuous firm anterior digital compression all the way to the operating theatre.',
        redFlag: 'Time-critical surgical emergency—pre-alert A&E & ENT immediately.'
      }
    ]
  },
  {
    id: 'cico-paed',
    title: 'Paediatric CICO (Front-of-Neck Access)',
    category: 'Last-Resort Airway',
    placement: 'extra',
    theme: 'slate',
    urgency: 'high',
    summary:
      'DAS / APA Paediatric "Can\'t Intubate, Can\'t Oxygenate" age-stratified front-of-neck rescue.',
    steps: [
      {
        id: 'cico-1',
        title: 'Declare CICO & Confirm Age-Specific Strategy',
        action:
          'Declare "Can\'t Intubate, Can\'t Oxygenate" aloud. Ensure full neuromuscular blockade and 100% O2 via upper airway.',
        details:
          'Children <8–10 years have a tiny, mobile cricothyroid membrane (~2–3 mm in infants): DAS guidelines favour 45° caudal needle cricothyroidotomy with saline aspiration. Adolescents (>10 yrs) favour Scalpel–Bougie–Tube.',
        redFlag: 'Do not delay FONA once SpO2 is falling rapidly with bradycardia.'
      },
      {
        id: 'cico-2',
        title: 'Laryngeal Handshake & Midline Access',
        action:
          'Stabilise the larynx with non-dominant thumb and middle finger; palpate the cricothyroid membrane with the index finger.',
        details:
          'For <8 yrs: advance a 14G/16G cannula attached to a saline-filled syringe at 45° caudally while aspirating continuously until air bubbles freely enter the syringe. For >10 yrs: horizontal stab incision, bougie, and railroad 5.0–6.0 mm cuffed tube.',
        redFlag:
          'Verify continuous air aspiration before delivering low-pressure oxygen to prevent barotrauma or surgical emphysema.'
      }
    ]
  },
  {
    id: 'stoma-granuloma',
    title: 'Stoma Care, Granulomas & Routine Tube Change',
    category: 'Ward / ENT On-Call',
    placement: 'extra',
    theme: 'slate',
    urgency: 'routine',
    summary:
      'Assessment of peristomal skin breakdown, suprastomal granulation tissue, tie tension, and planned two-person tube changes.',
    steps: [
      {
        id: 'stoma-1',
        title: 'Inspect Peristomal Skin & Tie Tension',
        action:
          'Check beneath the neck flange and ties for erythema, pressure ulceration, moisture maceration, or friable red granulation tissue.',
        details:
          'Ties should allow exactly ONE fingertip snugly between the tie and the neck when the chin is neutral. Too loose risks decannulation; too tight causes skin necrosis and venous congestion.',
        redFlag:
          'Never apply silver nitrate inside the tracheal lumen—only to external peristomal granulation under ENT guidance.'
      },
      {
        id: 'stoma-2',
        title: 'Two-Person Planned Tube Change Checklist',
        action:
          'Always perform routine paediatric tube changes with two trained people, suction ready, same-size + 0.5 mm smaller spare tubes, and pulse oximetry attached.',
        details:
          'Time the change before feeds (or >2 hours post-feed) to reduce vomiting/aspiration risk. Pre-thread clean ties onto the new tube before removing the old one.',
        redFlag:
          'Ensure the child\'s emergency go-bag is fully restocked immediately after the change.'
      }
    ]
  }
];

const INITIAL_TUBE_HARDWARE = [
  {
    id: 'tube-shiley-ped',
    name: 'Shiley™ Paediatric Uncuffed / Cuffed',
    manufacturer: 'Medtronic / Covidien',
    cuffType: 'Uncuffed (common) or Air-filled TaperGuard™ Cuff',
    innerCannula: 'No inner cannula (standard paediatric sizes 3.0–5.5)',
    visualCues:
      'Opaque white PVC shaft with flexible clear/white flange. Sizes printed clearly on left/right wings (e.g., 4.0 PED).',
    roadsideAction:
      'If cuffed, inflate/deflate using AIR with a standard 5–10 mL Luer syringe. Never leave a cuff inflated if a Passy-Muir speaking valve is attached.',
    photoUrl: ''
  },
  {
    id: 'tube-bivona-tts',
    name: 'Bivona® Tight-to-Shaft (TTS™) Paediatric',
    manufacturer: 'ICU Medical / Smiths Medical',
    cuffType: 'STERILE WATER-filled Silicone Cuff (deflates completely flush to shaft)',
    innerCannula: 'No inner cannula (wire-reinforced soft silicone shaft)',
    visualCues:
      'Soft, translucent/milky silicone tube with a prominent blue/white pilot balloon marked "STERILE WATER ONLY".',
    roadsideAction:
      'CRITICAL: Deflate and inflate ONLY with STERILE WATER (never saline—salt crystallises; never air—diffuses out of silicone). Deflating TTS makes it behave like an uncuffed tube.',
    photoUrl: ''
  },
  {
    id: 'tube-bivona-flextend',
    name: 'Bivona® FlexTend™ Plus Paediatric',
    manufacturer: 'ICU Medical / Smiths Medical',
    cuffType: 'Uncuffed or TTS Sterile Water Cuff',
    innerCannula: 'No inner cannula (extended proximal silicone neck)',
    visualCues:
      'Distinctive long flexible proximal extension between the neck flange and the 15 mm connector—designed to keep ventilator tubing away from the chin/chest.',
    roadsideAction:
      'Ensure suction catheter depth accounts for the extra proximal extension length. Check for kinking at the chin when child flexes neck.',
    photoUrl: ''
  },
  {
    id: 'valve-pmv',
    name: 'Passy-Muir® Speaking Valve (PMV 007 / 2000)',
    manufacturer: 'Passy-Muir Inc.',
    cuffType: 'One-Way Inspiratory Valve (attaches to 15 mm hub)',
    innerCannula: 'Accessory — REMOVE IMMEDIATELY in any airway distress',
    visualCues:
      'Distinctive bright AQUA/TEAL (PMV 007) or CLEAR/PURPLE (PMV 2000) low-profile cap sitting on the 15 mm tracheostomy hub.',
    roadsideAction:
      'REMOVE IMMEDIATELY during any respiratory distress, hypoxia, or emergency ventilation! Air enters on inspiration and MUST exhale around the tube through the upper airway—a cuff MUST be fully deflated.',
    photoUrl: ''
  },
  {
    id: 'acc-hme',
    name: 'Swedish Nose / HME (Heat & Moisture Exchanger)',
    manufacturer: 'Various (Portex / Smiths / Tracoe)',
    cuffType: 'Passive Humidification Filter (15 mm hub)',
    innerCannula: 'Accessory — inspect for mucus plugging & remove in distress',
    visualCues:
      'Small T-shaped or cylindrical clear/blue/green plastic casing containing foam or paper filter media on the end of the tube.',
    roadsideAction:
      'Secretions or blood rapidly turn an HME into a complete airway plug. Remove and discard immediately if breathing becomes noisy, laboured, or SpO2 drops.',
    photoUrl: ''
  }
];

const INITIAL_TROUBLESHOOT_ITEMS = [
  {
    id: 'ts-high-res',
    symptom: 'Cannot Pass Suction Catheter / High Resistance',
    likelyCauses: [
      'Thick dried mucus plug blocking distal tip',
      'Displaced tube sitting in pre-tracheal false passage',
      'Tube tip abutting posterior tracheal wall (neck flexion)'
    ],
    immediateActions: [
      'Remove any HME, cap, or speaking valve immediately.',
      'Extend the neck gently (shoulder roll) and re-attempt suction once.',
      'If catheter still fails to pass: deflate cuff and perform emergency tube change (same size, then 0.5 mm downsize).'
    ],
    severity: 'critical'
  },
  {
    id: 'ts-desat',
    symptom: 'Sudden Desaturation / Flat EtCO2 Waveform',
    likelyCauses: [
      'Complete tube obstruction or accidental decannulation',
      'Speaking valve left on with inflated cuff',
      'Tension pneumothorax or severe bronchospasm'
    ],
    immediateActions: [
      'Apply 100% O2 to BOTH stoma and mouth/nose immediately.',
      'Remove all hub attachments and pass suction catheter to prove patency.',
      'If flat EtCO2 persists, remove tube and replace with spare tube from emergency go-bag.'
    ],
    severity: 'critical'
  },
  {
    id: 'ts-bleed',
    symptom: 'Fresh Blood / Pulsatile Bleeding from Stoma',
    likelyCauses: [
      'Suction trauma or friable stomal granulation tissue (minor)',
      'Tracheo-innominate artery fistula (TIF) — life-threatening sentinel bleed'
    ],
    immediateActions: [
      'Stop deep suctioning immediately.',
      'If brisk/pulsatile: over-inflate cuff (if present), apply gentle anterior traction, and pre-alert A&E + ENT immediately.',
      'Never discharge a child with fresh unexplained stomal bleeding without ENT review.'
    ],
    severity: 'critical'
  },
  {
    id: 'ts-cuff-leak',
    symptom: 'Audible Air Leak / Inability to Ventilate',
    likelyCauses: [
      'Under-inflated or ruptured cuff (check if Bivona TTS needs sterile water)',
      'Partially dislodged tube with cuff sitting inside the stoma tract',
      'Pilot balloon valve failure'
    ],
    immediateActions: [
      'Check tube flange position—if protruding out of neck, treat as displaced tube.',
      'Check cuff type: Bivona TTS requires sterile water; Shiley uses air.',
      'If ventilation remains inadequate, prepare for controlled tube exchange.'
    ],
    severity: 'high'
  }
];

const INITIAL_LEARNING_MODULES = [
  {
    id: 'mod-paed-anatomy',
    title: 'Paediatric Tracheostomy Anatomy & Tube Essentials',
    badge: 'Core ENT / Pre-Hospital',
    settingTags: ['pre-hospital', 'in-patient', 'community'],
    duration: '6 mins',
    summary:
      'Key anatomical differences in infants vs. adolescents, cuff fluids (sterile water vs. air), and emergency go-bag essentials.',
    sections: [
      {
        heading: 'Why Paediatric Airways Behave Differently',
        body: 'In infants and young children, the larynx sits higher (C3–C4), the trachea is short and highly compliant, and the cricoid ring is functionally the narrowest point. Even 1 mm of mucosal oedema dramatically increases airway resistance (Poiseuille\'s Law: resistance is inversely proportional to radius to the 4th power).',
        pearl:
          'Always place a small rolled towel under the child\'s shoulders (neutral sniffing position) rather than hyperextending an infant\'s neck, which can collapse the soft trachea.'
      },
      {
        heading: 'Sterile Water vs. Air Cuffs (Never Mix Them Up)',
        body: 'Silicone Bivona® Tight-to-Shaft (TTS) cuffs are permeable to air and MUST be inflated with sterile water (not saline, which crystallises and blocks the inflation lumen). PVC Shiley™ cuffs use air. Always inspect the pilot balloon label before inflating or deflating.',
        pearl:
          'When a Bivona TTS cuff is deflated, it collapses completely flat against the shaft—making it ideal for children who alternate between nocturnal ventilation and daytime speaking valves.'
      },
      {
        heading: 'What Must Be in Every Paediatric Emergency Go-Bag',
        body: 'Every child with a tracheostomy must travel with: (1) Same-size spare tube with obturator, (2) One size smaller (0.5 mm downsize) spare tube, (3) Pre-measured suction catheters + portable suction, (4) Blunt-ended scissors, spare cotton/velcro ties, water-based lubricant, and a syringe matching their cuff type.',
        pearl:
          'Check the bedside/go-bag Green (patent upper airway) vs. Red (laryngectomy/closed upper airway) sign immediately on arrival.'
      }
    ],
    miniCase: {
      scenario:
        'You are called to a 3-year-old with a 4.0 mm Bivona® TTS tracheostomy whose mother reports a loud air leak during nocturnal BiPAP. The pilot balloon feels completely flat.',
      question: 'Which syringe fluid should you draw up to re-inflate the cuff?',
      answer:
        'Draw up STERILE WATER only (check the child\'s documented cuff volume, typically 1–3 mL, to minimal leak). Never use air (diffuses out of silicone) or normal saline (crystallises and permanently blocks the pilot valve).'
    },
    quiz: [
      {
        question:
          'Which fluid should be used to inflate a Bivona® Tight-to-Shaft (TTS) silicone tracheostomy cuff?',
        options: [
          '0.9% Sodium Chloride (Normal Saline)',
          'Sterile Water',
          'Room Air',
          '5% Dextrose'
        ],
        correctIndex: 1,
        explanation:
          'Bivona TTS silicone cuffs must ONLY be inflated with sterile water. Air diffuses rapidly across silicone, and saline can crystallise and block the pilot channel.'
      },
      {
        question:
          'A 4-year-old with a tracheostomy and a teal Passy-Muir speaking valve suddenly becomes hypoxic and agitated. What is your FIRST physical action at the tube?',
        options: [
          'Inflate the cuff to seal the airway',
          'Remove the Passy-Muir speaking valve immediately and apply O2',
          'Instil 5 mL of normal saline down the valve',
          'Cut the tracheostomy ties before removing the valve'
        ],
        correctIndex: 1,
        explanation:
          'Remove any speaking valve, cap, or HME immediately during airway distress so unobstructed exhalation and suctioning can occur.'
      }
    ]
  },
  {
    id: 'mod-false-passage',
    title: 'Preventing & Recognising Pre-Tracheal False Passages',
    badge: 'High-Risk Airway',
    settingTags: ['pre-hospital', 'in-patient'],
    duration: '5 mins',
    summary:
      'How false passages form during emergency tube changes, warning signs on capnography, and safe re-insertion technique.',
    sections: [
      {
        heading: 'Anatomy of a False Passage',
        body: 'Especially in fresh tracheostomies (<7 days old) or tight stomas, pushing a replacement tube straight posteriorly or with excessive force can dissect into the soft pre-tracheal tissue plane anterior to the trachea rather than entering the tracheal lumen.',
        pearl:
          'If a child has maturation stay sutures (taped to the chest labelled "Left" and "Right"), gently pull them upward and laterally to bring the tracheal opening to the skin surface.'
      },
      {
        heading: 'Safe Curved Insertion & Immediate Verification',
        body: 'Insert the lubricated spare tube with the obturator in place, following the natural downward curve of the trachea. Remove the obturator IMMEDIATELY once the flange reaches the neck. Confirm placement with waveform capnography (EtCO2), bilateral chest rise, and smooth passage of a suction catheter.',
        pearl:
          'Subcutaneous emphysema (neck crepitus), high ventilation pressures, and a flat EtCO2 trace after tube insertion are classic signs of a false passage—remove the tube immediately!'
      }
    ],
    miniCase: {
      scenario:
        'A 10-month-old with a 5-day-old tracheostomy pulls their tube out. After re-insertion, bagging feels rock-hard, EtCO2 is completely flat, and the neck feels puffy with crepitus.',
      question: 'What is the immediate life-saving step?',
      answer:
        'Stop ventilating through the tube and REMOVE IT IMMEDIATELY—it is in a pre-tracheal false passage. Cover the stoma and ventilate via the mouth/nose (if patent upper airway) while calling senior ENT/anaesthetics.'
    },
    quiz: [
      {
        question:
          'You insert a replacement tracheostomy tube and remove the obturator, but notice a flat EtCO2 trace, high bagging resistance, and new crepitus in the neck. What has likely happened?',
        options: [
          'Normal post-change bronchospasm',
          'Pre-tracheal false passage — remove the tube immediately',
          'The cuff needs more air',
          'The child needs deeper sedation'
        ],
        correctIndex: 1,
        explanation:
          'Flat EtCO2, high resistance, and neck crepitus indicate a pre-tracheal false passage. Stop ventilating through the tube and remove it immediately to avoid worsening surgical emphysema and pneumomediastinum.'
      }
    ]
  },
  {
    id: 'mod-valves-hme',
    title: 'Speaking Valves, HMEs & Cuff Safety',
    badge: 'Roadside & Ward',
    settingTags: ['pre-hospital', 'community'],
    duration: '4 mins',
    summary:
      'Safe use of Passy-Muir one-way valves and Swedish noses (HMEs), and why cuff inflation with a valve causes fatal breath-stacking.',
    sections: [
      {
        heading: 'How a One-Way Speaking Valve Works',
        body: 'A Passy-Muir valve (PMV 007 aqua or PMV 2000 clear/purple) opens on inspiration to let air enter the tracheostomy tube, then snaps shut on expiration so air is redirected upward around the tube and through the vocal cords for phonation.',
        pearl:
          'NEVER inflate a tracheostomy cuff while a speaking valve is on the hub—air enters on inspiration but has zero exit route on expiration, causing rapid breath-stacking and cardiac arrest.'
      },
      {
        heading: 'HMEs (Swedish Noses) & Secretion Plugging',
        body: 'Passive Heat & Moisture Exchangers warm and humidify inspired air. However, wet secretions or blood rapidly saturate the internal foam/paper filter, converting it into a complete airway plug.',
        pearl:
          'Always remove and inspect the HME first whenever a child develops noisy breathing, increased work of breathing, or desaturation.'
      }
    ],
    miniCase: {
      scenario:
        'An ambulance crew attends a 6-year-old whose school carer put a teal Passy-Muir valve on after suctioning. Within 2 minutes the child becomes silent, distressed, and SpO2 drops to 78%.',
      question: 'What two checks must happen in the first 5 seconds?',
      answer:
        '1) Pull the Passy-Muir speaking valve straight off the 15 mm hub. 2) Check whether the tracheostomy cuff was accidentally left inflated and deflate it immediately.'
    },
    quiz: [
      {
        question:
          'Why is an inflated tracheostomy cuff an absolute contraindication to placing a Passy-Muir speaking valve?',
        options: [
          'It dries out the tracheal mucosa',
          'It blocks exhalation around the tube, causing complete airway obstruction and breath-stacking',
          'It causes the valve to fall off the 15 mm hub',
          'It interferes with pulse oximetry readings'
        ],
        correctIndex: 1,
        explanation:
          'A one-way valve allows air in through the tube but requires exhalation around the outside of the tube via the upper airway; an inflated cuff completely blocks exhalation.'
      }
    ]
  },
  {
    id: 'mod-tif-bleed',
    title: 'Tracheo-Innominate Fistula & Stomal Haemorrhage',
    badge: 'Vascular Red Flag',
    settingTags: ['pre-hospital', 'in-patient'],
    duration: '5 mins',
    summary:
      'Differentiating benign granulation oozing from life-threatening sentinel bleeds and executing emergency tamponade.',
    sections: [
      {
        heading: 'Recognising the Sentinel Bleed',
        body: 'A tracheo-innominate artery fistula (TIF) occurs when a low-placed tracheostomy tube or high-pressure cuff erodes anteriorly into the brachiocephalic (innominate) artery. Up to 50% of cases present first with a brief, self-limiting "sentinel bleed" of >10 mL bright red blood days to weeks post-tracheostomy.',
        pearl:
          'Peak window is 3 days to 6 weeks post-insertion, though late TIF can occur at any time—never reassure and discharge a child with fresh unexplained stomal bleeding without ENT assessment.'
      },
      {
        heading: 'Immediate Tamponade: Cuff Hyperinflation & Utley Manoeuvre',
        body: 'In catastrophic pulsatile haemorrhage, do NOT blindly pull the tube out unless an oral airway is secured. Over-inflate the cuff (if present) and pull gently anteriorly. If exsanguinating bleeding persists after oral intubation, insert a gloved finger into the stoma and compress the innominate artery forward against the sternum (Utley manoeuvre) all the way to theatre.',
        pearl:
          'Pre-alert A&E Resus, ENT, Cardiothoracic Surgery, and Activate Major Haemorrhage Protocol early.'
      }
    ],
    miniCase: {
      scenario:
        'A 5-year-old who had a tracheostomy formed 18 days ago coughs up ~15 mL of bright red blood via the tube at home. By the time you arrive, bleeding has stopped and observations are normal.',
      question: 'Can the child stay at home with GP follow-up?',
      answer:
        'NO. Treat any >10 mL bright red bleed within 3 days–6 weeks of tracheostomy as a sentinel bleed for a tracheo-innominate fistula. Transport urgently to A&E with ENT pre-alerted.'
    },
    quiz: [
      {
        question:
          'During massive pulsatile bleeding from a cuffed tracheostomy tube, what is the immediate bedside tamponade manoeuvre?',
        options: [
          'Deflate the cuff and remove the tube immediately',
          'Over-inflate the cuff and apply gentle anterior traction while alerting ENT/Cardiothoracics',
          'Perform vigorous deep suctioning to clear all clots',
          'Attach a Passy-Muir speaking valve to increase PEEP'
        ],
        correctIndex: 1,
        explanation:
          'Over-inflating the cuff with gentle anterior traction compresses the innominate artery against the posterior sternum as a bridge to emergency surgical control.'
      }
    ]
  }
];

const MODULE_SETTING_FILTERS = [
  { id: 'all', label: 'All Modules' },
  { id: 'pre-hospital', label: 'Pre-Hospital Emergencies' },
  { id: 'in-patient', label: 'In-Patient' },
  { id: 'community', label: 'Non-Emergent Community Care' }
];

const INITIAL_COURSE_FEEDBACK = [
  {
    id: 'cfb-1',
    submittedAt: '2026-11-18',
    moduleTitle: 'Paediatric Tracheostomy Anatomy & Tube Essentials',
    relevanceRating: 5,
    qualityRating: 5,
    objectivesRating: 5,
    overallRating: 5,
    comments: 'Super clear explanation of Bivona TTS sterile water vs Shiley air cuffs.'
  },
  {
    id: 'cfb-2',
    submittedAt: '2026-10-29',
    moduleTitle: 'Preventing & Recognising Pre-Tracheal False Passages',
    relevanceRating: 4,
    qualityRating: 4,
    objectivesRating: 4,
    overallRating: 4,
    comments: 'Helpful clinical mini-case; would love a short video clip of stay sutures too.'
  },
  {
    id: 'cfb-3',
    submittedAt: '2026-09-14',
    moduleTitle: 'Speaking Valves, HMEs & Cuff Safety',
    relevanceRating: 3,
    qualityRating: 2,
    objectivesRating: 2,
    overallRating: 2,
    comments: 'Could include more detail on daytime community school care plans.'
  }
];

const INITIAL_WEBSITE_FEEDBACK = [
  {
    id: 'wfb-1',
    submittedAt: '2026-11-20',
    category: 'Feature Request',
    area: 'Tube ID',
    message: 'Having uploaded Tube ID photos work completely offline on ambulance shifts is brilliant.'
  }
];

const INITIAL_EXTERNAL_RESOURCES = [
  {
    id: 'res-ntsp',
    title: 'National Tracheostomy Safety Project (NTSP) Paediatric Algorithms',
    organisation: 'NTSP UK',
    category: 'Emergency Guidelines',
    url: 'https://www.tracheostomy.org.uk/healthcare-staff/emergency-care/paediatric-emergency-algorithms',
    description: 'Official UK Green and Red paediatric tracheostomy bedhead signs and emergency algorithms.'
  },
  {
    id: 'res-das',
    title: 'DAS / APA Paediatric Difficult Airway Guidelines',
    organisation: 'Difficult Airway Society',
    category: 'Airway & CICO',
    url: 'https://das.uk.com/guidelines/paediatric-difficult-airway-guidelines',
    description: 'National UK guidelines for unexpected difficult intubation and paediatric CICO rescue.'
  },
  {
    id: 'res-gosh',
    title: 'Great Ormond Street Hospital (GOSH) Tracheostomy Clinical Guidelines',
    organisation: 'GOSH NHS Foundation Trust',
    category: 'In-Patient & Community',
    url: 'https://www.gosh.nhs.uk/health-professionals/clinical-guidelines/tracheostomy-care-and-management-review/',
    description: 'Comprehensive nursing, suctioning, stoma care, and community discharge guidance.'
  },
  {
    id: 'res-rcuk',
    title: 'Resuscitation Council UK Paediatric Basic & Advanced Life Support',
    organisation: 'Resuscitation Council UK',
    category: 'Resuscitation',
    url: 'https://www.resus.org.uk/library/2021-resuscitation-guidelines/paediatric-basic-life-support-guidelines',
    description: 'UK paediatric resuscitation algorithms and emergency oxygenation priorities.'
  }
];

const SIX_MONTHS_MS = 183 * 24 * 60 * 60 * 1000;

function filterWithinSixMonths(entries = []) {
  const cutoff = Date.now() - SIX_MONTHS_MS;
  return (entries || []).filter((entry) => {
    if (!entry?.submittedAt) return false;
    const ts = new Date(entry.submittedAt).getTime();
    return !Number.isNaN(ts) && ts >= cutoff;
  });
}

function getScoreBadgeClasses(score) {
  const num = Number(score);
  if (num <= 2) return 'bg-rose-100 text-rose-800 border-rose-300';
  if (num <= 4) return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-emerald-100 text-emerald-800 border-emerald-300';
}

function getExcelScoreColors(score) {
  const num = Number(score);
  if (num <= 2) return { bg: '#FEE2E2', fg: '#991B1B' };
  if (num <= 4) return { bg: '#FFEDD5', fg: '#9A3412' };
  return { bg: '#D1FAE5', fg: '#065F46' };
}

function escapeHtmlForExcel(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadPaedTrachesCourseFeedbackExcel(entries = []) {
  const cleanEntries = filterWithinSixMonths(entries);
  const total = cleanEntries.length;
  const avgOverall = total
    ? (cleanEntries.reduce((acc, e) => acc + Number(e.overallRating || 0), 0) / total).toFixed(1)
    : 'N/A';
  const avgRel = total
    ? (cleanEntries.reduce((acc, e) => acc + Number(e.relevanceRating || 0), 0) / total).toFixed(1)
    : 'N/A';
  const avgQual = total
    ? (cleanEntries.reduce((acc, e) => acc + Number(e.qualityRating || 0), 0) / total).toFixed(1)
    : 'N/A';
  const exportDate = new Date().toISOString().slice(0, 10);

  const rowsHtml = cleanEntries
    .map((e, idx) => {
      const sc = getExcelScoreColors(e.overallRating);
      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      return `
        <tr style="background-color:${rowBg};">
          <td style="border:1px solid #CBD5E1;padding:8px;text-align:center;font-weight:bold;white-space:nowrap;">${escapeHtmlForExcel(e.submittedAt)}</td>
          <td style="border:1px solid #CBD5E1;padding:8px;font-weight:600;color:#0F172A;">${escapeHtmlForExcel(e.moduleTitle)}</td>
          <td style="border:1px solid #CBD5E1;padding:8px;text-align:center;">${escapeHtmlForExcel(e.relevanceRating)} / 5</td>
          <td style="border:1px solid #CBD5E1;padding:8px;text-align:center;">${escapeHtmlForExcel(e.qualityRating)} / 5</td>
          <td style="border:1px solid #CBD5E1;padding:8px;text-align:center;">${escapeHtmlForExcel(e.objectivesRating || e.overallRating)} / 5</td>
          <td style="border:1px solid #CBD5E1;padding:8px;text-align:center;font-weight:bold;background-color:${sc.bg};color:${sc.fg};">${escapeHtmlForExcel(e.overallRating)} / 5</td>
          <td style="border:1px solid #CBD5E1;padding:8px;color:#334155;">${escapeHtmlForExcel(e.comments || '—')}</td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Course Feedback</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body style="font-family:Calibri,Arial,sans-serif;color:#0F172A;">
        <table style="border-collapse:collapse;width:100%;">
          <tr>
            <td colspan="7" style="background-color:#059669;color:#FFFFFF;padding:16px 20px;border:1px solid #047857;">
              <div style="font-size:20px;font-weight:bold;">&#10010; PaedTraches &mdash; Course Evaluation &amp; CPD Feedback Report</div>
              <div style="font-size:12px;color:#D1FAE5;margin-top:4px;">Paediatric Tracheostomy Clinical Education &bull; Exported: ${exportDate} &bull; Auto-Retention: Last 6 Months Only</div>
            </td>
          </tr>
          <tr style="background-color:#ECFDF5;">
            <td colspan="2" style="border:1px solid #A7F3D0;padding:10px;font-weight:bold;color:#065F46;">Total Responses (Last 6m): ${total}</td>
            <td colspan="2" style="border:1px solid #A7F3D0;padding:10px;font-weight:bold;color:#065F46;">Avg Relevance: ${avgRel} / 5</td>
            <td colspan="1" style="border:1px solid #A7F3D0;padding:10px;font-weight:bold;color:#065F46;">Avg Quality: ${avgQual} / 5</td>
            <td colspan="2" style="border:1px solid #A7F3D0;padding:10px;font-weight:bold;color:#065F46;">Avg Overall Score: ${avgOverall} / 5</td>
          </tr>
          <tr><td colspan="7" style="height:10px;"></td></tr>
          <tr style="background-color:#0F172A;color:#FFFFFF;">
            <th style="border:1px solid #0F172A;padding:10px;text-align:center;">Date</th>
            <th style="border:1px solid #0F172A;padding:10px;text-align:left;">Module / Scope</th>
            <th style="border:1px solid #0F172A;padding:10px;text-align:center;">Relevance</th>
            <th style="border:1px solid #0F172A;padding:10px;text-align:center;">Quality</th>
            <th style="border:1px solid #0F172A;padding:10px;text-align:center;">Objectives</th>
            <th style="border:1px solid #0F172A;padding:10px;text-align:center;">Overall Score</th>
            <th style="border:1px solid #0F172A;padding:10px;text-align:left;">Comments / Suggestions</th>
          </tr>
          ${rowsHtml}
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PaedTraches-Course-Feedback-${exportDate}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadPaedTrachesWebsiteFeedbackExcel(entries = []) {
  const cleanEntries = filterWithinSixMonths(entries);
  const exportDate = new Date().toISOString().slice(0, 10);

  const rowsHtml = cleanEntries
    .map((e, idx) => {
      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      return `
        <tr style="background-color:${rowBg};">
          <td style="border:1px solid #CBD5E1;padding:8px;text-align:center;font-weight:bold;white-space:nowrap;">${escapeHtmlForExcel(e.submittedAt)}</td>
          <td style="border:1px solid #CBD5E1;padding:8px;font-weight:600;color:#0F172A;">${escapeHtmlForExcel(e.category)}</td>
          <td style="border:1px solid #CBD5E1;padding:8px;color:#334155;">${escapeHtmlForExcel(e.area || 'General')}</td>
          <td style="border:1px solid #CBD5E1;padding:8px;color:#0F172A;">${escapeHtmlForExcel(e.message)}</td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8" /></head>
      <body style="font-family:Calibri,Arial,sans-serif;color:#0F172A;">
        <table style="border-collapse:collapse;width:100%;">
          <tr>
            <td colspan="4" style="background-color:#0F172A;color:#FFFFFF;padding:16px 20px;border:1px solid #0F172A;">
              <div style="font-size:20px;font-weight:bold;">&#10010; PaedTraches &mdash; Website Issues &amp; General Feedback Log</div>
              <div style="font-size:12px;color:#CBD5E1;margin-top:4px;">Exported: ${exportDate} &bull; Total Entries (Last 6 Months): ${cleanEntries.length}</div>
            </td>
          </tr>
          <tr><td colspan="4" style="height:10px;"></td></tr>
          <tr style="background-color:#059669;color:#FFFFFF;">
            <th style="border:1px solid #047857;padding:10px;text-align:center;">Date</th>
            <th style="border:1px solid #047857;padding:10px;text-align:left;">Category</th>
            <th style="border:1px solid #047857;padding:10px;text-align:left;">Website Area</th>
            <th style="border:1px solid #047857;padding:10px;text-align:left;">Issue / Feedback Details</th>
          </tr>
          ${rowsHtml}
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PaedTraches-Website-Issues-${exportDate}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const INITIAL_PROCEDURE_SIMS = [
  {
    id: 'sim-cric',
    title: 'Emergency Paediatric Cricothyroidotomy (CICO)',
    badge: 'DAS / ENT Front-of-Neck',
    subtitle: 'Age-stratified needle (<8–10 yrs) vs. surgical scalpel–bougie–tube (>10 yrs) rescue',
    diagramType: 'builtin-neck',
    customDiagramUrl: '',
    supportsAgeSwitch: true,
    disclaimer:
      'Educational simulation only. Follows DAS/APA paediatric CICO principles; always verify current local NHS Trust / JRCALC / NTSP protocols.',
    tools: [
      {
        id: 'tool-hands',
        short: 'Palpate',
        name: 'Laryngeal Handshake (Non-Dominant Hand)',
        desc: 'Stabilise the thyroid cartilage between thumb and middle finger; palpate CTM with index finger.'
      },
      {
        id: 'tool-marker',
        short: 'Mark CTM',
        name: 'Surgical Skin Marker',
        desc: 'Mark the midline over the thyroid cartilage, cricothyroid membrane, and cricoid ring.'
      },
      {
        id: 'tool-prep',
        short: 'Prep Skin',
        name: '2% Chlorhexidine Antiseptic Swab',
        desc: 'Rapidly scrub the anterior neck surgical field around the cricothyroid membrane.'
      },
      {
        id: 'tool-needle',
        short: 'Needle CTM',
        name: '14G/16G Cannula + Saline Syringe',
        desc: 'For infants & children (<8–10 yrs): advance at 45° caudally while aspirating for free air bubbles.'
      },
      {
        id: 'tool-scalpel',
        short: 'Scalpel',
        name: 'No. 10 / 20 Scalpel Blade',
        desc: 'For adolescents (>10 yrs): horizontal stab incision across the cricothyroid membrane.'
      },
      {
        id: 'tool-bougie',
        short: 'Bougie',
        name: 'Paediatric / Frova Bougie',
        desc: 'Advance gently downward into the incised tracheal lumen to 8–10 cm (stop at hold-up).'
      },
      {
        id: 'tool-tube',
        short: 'Cuffed Tube',
        name: 'Lubricated Cuffed ETT + EtCO2',
        desc: 'Railroad tube over bougie into trachea, inflate cuff, remove bougie, and confirm square-wave EtCO2.'
      }
    ],
    steps: [
      {
        id: 'cric-1',
        phase: '1. Landmarking',
        title: 'Laryngeal Handshake & Stabilisation',
        instruction:
          'Select Palpate, then press and hold steadily over the thyroid/cricothyroid region to immobilise the mobile paediatric larynx.',
        traineeTip:
          'In children, the larynx is small and highly mobile—firm stabilisation with your non-dominant hand prevents the trachea rolling laterally.',
        requiredTool: 'tool-hands',
        interactionType: 'hold',
        ageGroups: ['all'],
        targetZone: { x: 250, y: 170, r: 34, label: 'Thyroid / CTM Complex' },
        demoHint: 'Press and hold on the highlighted laryngeal ring until stabilisation reaches 100%.'
      },
      {
        id: 'cric-2',
        phase: '1. Landmarking',
        title: 'Mark Midline & Cricothyroid Membrane',
        instruction:
          'Select Mark CTM, then trace vertically down the midline from the thyroid cartilage across the cricothyroid membrane to the cricoid ring.',
        traineeTip:
          'A crisp midline reference prevents lateral drift toward the anterior jugular veins and carotid sheath.',
        requiredTool: 'tool-marker',
        interactionType: 'draw',
        ageGroups: ['all'],
        targetZone: { x: 250, y: 182, r: 28, label: 'Midline CTM' },
        dragStart: { x: 250, y: 142 },
        dragEnd: { x: 250, y: 215 },
        demoHint: 'Start on the orange dot above the thyroid cartilage and trace straight down to the green dot.'
      },
      {
        id: 'cric-3',
        phase: '2. Field Preparation',
        title: 'Chlorhexidine Antiseptic Skin Prep',
        instruction:
          'Select Prep Skin, then scrub back-and-forth across the anterior neck zone to coat the surgical field.',
        traineeTip:
          'In life-threatening CICO, perform a rapid 3-second antiseptic splash/scrub—never delay oxygenation waiting for alcohol prep to dry completely.',
        requiredTool: 'tool-prep',
        interactionType: 'paint',
        ageGroups: ['all'],
        targetZone: { x: 250, y: 182, r: 54, label: 'Anterior Neck Surgical Field' },
        demoHint: 'Brush back and forth across the circular surgical zone until coverage hits 100%.'
      },
      {
        id: 'cric-4',
        phase: '3. Paediatric Needle Rescue (<8–10 yrs)',
        title: '45° Caudal Needle Cricothyroidotomy & Air Aspiration',
        instruction:
          'Select Needle CTM, start at the orange entry dot on the cricothyroid membrane, and advance caudally while watching for saline syringe air bubbles.',
        traineeTip:
          'Stop advancing the needle the instant free air bubbles enter the saline syringe—then slide ONLY the plastic cannula off the needle into the trachea.',
        requiredTool: 'tool-needle',
        interactionType: 'advance',
        ageGroups: ['infant', 'child'],
        targetZone: { x: 250, y: 182, r: 24, label: 'Cricothyroid Membrane Entry' },
        dragStart: { x: 250, y: 182 },
        dragEnd: { x: 250, y: 242 },
        demoHint: 'Drag smoothly from the orange CTM dot downward along the blue tract to the green marker.'
      },
      {
        id: 'cric-5',
        phase: '3. Surgical FONA (>10 yrs)',
        title: 'Horizontal Scalpel Incision Across CTM',
        instruction:
          'Select Scalpel, start at the orange dot on the left border of the cricothyroid membrane, and incise horizontally to the green dot.',
        traineeTip:
          'Keep the incision strictly across the lower half of the cricothyroid membrane to avoid the cricothyroid arteries running superiorly.',
        requiredTool: 'tool-scalpel',
        interactionType: 'draw',
        ageGroups: ['adolescent'],
        targetZone: { x: 250, y: 182, r: 28, label: 'Cricothyroid Membrane' },
        dragStart: { x: 226, y: 182 },
        dragEnd: { x: 274, y: 182 },
        demoHint: 'Trace horizontally from the left orange dot across the pink membrane to the right green dot.'
      },
      {
        id: 'cric-6',
        phase: '4. Airway Securing (>10 yrs)',
        title: 'Advance Paediatric Bougie Into Open Lumen',
        instruction:
          'Select Bougie, start at the incised CTM window (orange dot), and advance gently downward into the open tracheal lumen to the green depth marker.',
        traineeTip:
          'Do not force past gentle hold-up at 8–10 cm. Keep the coudé tip directed anteriorly/caudally along the tracheal rings.',
        requiredTool: 'tool-bougie',
        interactionType: 'advance',
        ageGroups: ['adolescent'],
        targetZone: { x: 250, y: 182, r: 24, label: 'Incised CTM Window' },
        dragStart: { x: 250, y: 182 },
        dragEnd: { x: 250, y: 268 },
        demoHint: 'Push smoothly from the orange window dot straight down into the open tracheal lumen.'
      },
      {
        id: 'cric-7',
        phase: '4. Airway Securing',
        title: 'Railroad Cuffed Tube / Attach O2 & Confirm EtCO2',
        instruction:
          'Select Cuffed Tube and tap the secured airway entry site to connect oxygenation and confirm square-wave EtCO2.',
        traineeTip:
          'Inflate cuff (if cuffed tube), remove bougie, hold the tube securely by hand at all times, and confirm square-wave capnography + rising SpO2.',
        requiredTool: 'tool-tube',
        interactionType: 'tap',
        ageGroups: ['all'],
        targetZone: { x: 250, y: 182, r: 26, label: 'Tracheal Airway Hub' },
        demoHint: 'Tap directly on the highlighted cricothyroid airway entry point.'
      }
    ]
  },
  {
    id: 'sim-trache-change',
    title: 'Emergency Tracheostomy Tube Change & False Passage',
    badge: 'NTSP Core Skill',
    subtitle: 'Safe curved obturator insertion into the true tracheal lumen while avoiding the pre-tracheal plane',
    diagramType: 'builtin-sagittal',
    customDiagramUrl: '',
    supportsAgeSwitch: false,
    disclaimer:
      'Educational simulation only. Always verify spare tube sizes (same size + 0.5 mm downsize) from the child\'s emergency go-bag.',
    tools: [
      {
        id: 'tool-scissors',
        short: 'Cut Ties',
        name: 'Blunt-Ended Safety Scissors',
        desc: 'Safely release soiled or tight tracheostomy ties without nicking the neck skin.'
      },
      {
        id: 'tool-suction',
        short: 'Suction Stoma',
        name: 'Pre-Measured Suction Catheter',
        desc: 'Clear pooling secretions around the stoma opening before inserting the spare tube.'
      },
      {
        id: 'tool-trache',
        short: 'Insert Tube',
        name: 'Lubricated Spare Tube + Obturator',
        desc: 'Guide gently posteriorly into the stoma, then curve caudally down the true tracheal lumen.'
      },
      {
        id: 'tool-obturator',
        short: 'Pull Obturator',
        name: 'Immediate Obturator Removal + EtCO2',
        desc: 'Withdraw the obturator the instant the flange sits flush and confirm square-wave EtCO2.'
      }
    ],
    steps: [
      {
        id: 'tc-1',
        phase: '1. Preparation',
        title: 'Release Tracheostomy Ties',
        instruction:
          'Select Cut Ties and trace across the anterior neck flange line to release the old ties safely.',
        traineeTip:
          'Have an assistant hold the old tube gently until you are ready to swap, and have both the same-size and 0.5 mm downsize tubes lubricated and ready.',
        requiredTool: 'tool-scissors',
        interactionType: 'draw',
        ageGroups: ['all'],
        targetZone: { x: 175, y: 164, r: 28, label: 'Anterior Neck Flange' },
        dragStart: { x: 165, y: 140 },
        dragEnd: { x: 165, y: 188 },
        demoHint: 'Trace downward from the orange dot to the green dot at the anterior neck stoma.'
      },
      {
        id: 'tc-2',
        phase: '1. Preparation',
        title: 'Clear Stoma Secretions',
        instruction:
          'Select Suction Stoma and gently sweep across the anterior stoma entrance to clear secretions.',
        traineeTip:
          'Clearing secretions gives a direct visual view of the tracheal lumen opening so you stay clear of the pre-tracheal plane.',
        requiredTool: 'tool-suction',
        interactionType: 'paint',
        ageGroups: ['all'],
        targetZone: { x: 200, y: 164, r: 34, label: 'Stoma Entrance' },
        demoHint: 'Scrub gently across the stoma entrance circle until 100% cleared.'
      },
      {
        id: 'tc-3',
        phase: '2. Tube Insertion',
        title: 'Advance Spare Tube Into True Tracheal Lumen',
        instruction:
          'Select Insert Tube, start at the anterior stoma (orange dot), and advance into the TRUE tracheal lumen (green dot) — avoiding the red dashed pre-tracheal false passage.',
        traineeTip:
          'Never force against resistance! If the same-size tube will not pass smoothly, step down immediately to the 0.5 mm smaller spare tube.',
        requiredTool: 'tool-trache',
        interactionType: 'advance',
        ageGroups: ['all'],
        targetZone: { x: 185, y: 164, r: 24, label: 'Stoma Entry' },
        dragStart: { x: 185, y: 164 },
        dragEnd: { x: 265, y: 245 },
        demoHint: 'Slide smoothly from the orange stoma dot posteriorly and downward into the blue tracheal lumen.'
      },
      {
        id: 'tc-4',
        phase: '3. Confirmation',
        title: 'Remove Obturator Immediately & Confirm EtCO2',
        instruction:
          'Select Pull Obturator and tap the neck flange to remove the obturator immediately and confirm square-wave capnography.',
        traineeTip:
          'Leaving an obturator inside the tube completely occludes the airway! Remove it within 1 second of seating the flange.',
        requiredTool: 'tool-obturator',
        interactionType: 'tap',
        ageGroups: ['all'],
        targetZone: { x: 165, y: 164, r: 28, label: 'Tracheostomy Flange' },
        demoHint: 'Tap directly on the highlighted tracheostomy neck flange.'
      }
    ]
  }
];

// ==========================================
// HELPERS & PRECISION SVG TOOL RENDERERS
// ==========================================

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderSimToolGlyph(toolId, className = 'w-4 h-4') {
  if (!toolId) return <Wrench className={className} />;
  if (toolId.includes('hands')) return <Activity className={className} />;
  if (toolId.includes('marker')) return <Edit3 className={className} />;
  if (toolId.includes('prep') || toolId.includes('suction')) return <Compass className={className} />;
  if (toolId.includes('needle') || toolId.includes('scalpel')) return <AlertTriangle className={className} />;
  if (toolId.includes('tube') || toolId.includes('trache') || toolId.includes('bougie'))
    return <Stethoscope className={className} />;
  return <Wrench className={className} />;
}

/**
 * Sleek, precision vector tool cursor anchored directly at (0, 0) contact tip.
 */
function renderSvgCanvasToolCursor(toolId) {
  if (toolId === 'tool-hands') {
    return (
      <g>
        <circle cx="0" cy="0" r="3" fill="#38bdf8" opacity="0.85" />
        <path
          d="M 0 0 L 2 -11 C 2 -14 6 -14 6 -11 L 6 -5 L 8 -12 C 8 -15 12 -15 12 -12 L 11 -4 L 14 -10 C 14 -12 17 -11 17 -9 L 15 1 C 14 7 9 10 4 9 C 0 8 -2 4 0 0 Z"
          fill="#fde68a"
          stroke="#92400e"
          strokeWidth="1.2"
        />
      </g>
    );
  }
  if (toolId === 'tool-marker') {
    return (
      <g>
        <path d="M 0 0 L 4 -6 L 16 -22 L 20 -19 L 8 -3 Z" fill="#2563eb" stroke="#0f172a" strokeWidth="1" />
        <polygon points="0,0 4,-6 7,-3" fill="#1e3a8a" />
      </g>
    );
  }
  if (toolId === 'tool-prep' || toolId === 'tool-suction') {
    return (
      <g>
        <ellipse
          cx="0"
          cy="0"
          rx="6"
          ry="4"
          transform="rotate(-35)"
          fill={toolId === 'tool-prep' ? '#fb923c' : '#38bdf8'}
          stroke="#ffffff"
          strokeWidth="1.1"
        />
        <line x1="4" y1="-4" x2="20" y2="-20" stroke="#e2e8f0" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    );
  }
  if (toolId === 'tool-needle') {
    return (
      <g>
        <line x1="0" y1="0" x2="10" y2="-10" stroke="#e2e8f0" strokeWidth="1.4" />
        <rect
          x="10"
          y="-24"
          width="6"
          height="16"
          rx="1.5"
          transform="rotate(45 10 -10)"
          fill="rgba(56, 189, 248, 0.8)"
          stroke="#ffffff"
          strokeWidth="1"
        />
      </g>
    );
  }
  if (toolId === 'tool-scalpel') {
    return (
      <g>
        <path d="M 0 0 L 9 -6 L 7 -10 L 1 -3 Z" fill="#f8fafc" stroke="#475569" strokeWidth="0.9" />
        <line x1="8" y1="-8" x2="22" y2="-22" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }
  if (toolId === 'tool-bougie') {
    return (
      <g>
        <path d="M 0 0 Q 2 -7 10 -14 L 22 -24" fill="none" stroke="#38bdf8" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="0" cy="0" r="2" fill="#e0f2fe" />
      </g>
    );
  }
  if (toolId === 'tool-scissors') {
    return (
      <g>
        <line x1="0" y1="0" x2="14" y2="-16" stroke="#e2e8f0" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="2" y1="2" x2="18" y2="-10" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="17" cy="-19" r="3.5" fill="none" stroke="#94a3b8" strokeWidth="1.4" />
        <circle cx="21" cy="-12" r="3.5" fill="none" stroke="#94a3b8" strokeWidth="1.4" />
      </g>
    );
  }
  return (
    <g>
      <path d="M 0 0 Q 4 -12 16 -18" fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round" />
      <rect x="12" y="-22" width="8" height="6" rx="1.5" fill="#ffffff" stroke="#059669" strokeWidth="1" />
    </g>
  );
}

// ==========================================
// MAIN APPLICATION
// ==========================================

export default function App() {
  // Top-level Navigation: 'pathways' | 'learning'
  const [activeTopTab, setActiveTopTab] = useState('pathways');
  const [onCallSubView, setOnCallSubView] = useState('main'); // 'main' | 'extra'
  const [learningSectionTab, setLearningSectionTab] = useState('modules'); // 'modules' | 'simulator'

  // Firebase Cloud Sync State
  const [fbUser, setFbUser] = useState(null);
  const [cloudStatus, setCloudStatus] = useState(db ? 'connecting' : 'offline');
  const [adminAuthError, setAdminAuthError] = useState('');

  // Persisted Clinical Data
  const [pathways, setPathways] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_pathways_v3');
      return saved ? JSON.parse(saved) : INITIAL_PATHWAYS;
    } catch {
      return INITIAL_PATHWAYS;
    }
  });

  const [tubeHardwareList, setTubeHardwareList] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_tube_hw_v1');
      return saved ? JSON.parse(saved) : INITIAL_TUBE_HARDWARE;
    } catch {
      return INITIAL_TUBE_HARDWARE;
    }
  });

  const [learningModules, setLearningModules] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_modules_v2');
      return saved ? JSON.parse(saved) : INITIAL_LEARNING_MODULES;
    } catch {
      return INITIAL_LEARNING_MODULES;
    }
  });

  const [procedureSims, setProcedureSims] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_sims_v2');
      return saved ? JSON.parse(saved) : INITIAL_PROCEDURE_SIMS;
    } catch {
      return INITIAL_PROCEDURE_SIMS;
    }
  });

  // Feedback (Auto-purged > 6 months) & External Resources State
  const [courseFeedbackLogs, setCourseFeedbackLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_course_fb_v1');
      const parsed = saved ? JSON.parse(saved) : INITIAL_COURSE_FEEDBACK;
      return filterWithinSixMonths(parsed);
    } catch {
      return filterWithinSixMonths(INITIAL_COURSE_FEEDBACK);
    }
  });

  const [websiteFeedbackLogs, setWebsiteFeedbackLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_web_fb_v1');
      const parsed = saved ? JSON.parse(saved) : INITIAL_WEBSITE_FEEDBACK;
      return filterWithinSixMonths(parsed);
    } catch {
      return filterWithinSixMonths(INITIAL_WEBSITE_FEEDBACK);
    }
  });

  const [externalResources, setExternalResources] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_ext_res_v1');
      return saved ? JSON.parse(saved) : INITIAL_EXTERNAL_RESOURCES;
    } catch {
      return INITIAL_EXTERNAL_RESOURCES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pt_pathways_v3', JSON.stringify(pathways));
      localStorage.setItem('pt_tube_hw_v1', JSON.stringify(tubeHardwareList));
      localStorage.setItem('pt_modules_v2', JSON.stringify(learningModules));
      localStorage.setItem('pt_sims_v2', JSON.stringify(procedureSims));
      localStorage.setItem(
        'pt_course_fb_v1',
        JSON.stringify(filterWithinSixMonths(courseFeedbackLogs))
      );
      localStorage.setItem(
        'pt_web_fb_v1',
        JSON.stringify(filterWithinSixMonths(websiteFeedbackLogs))
      );
      localStorage.setItem('pt_ext_res_v1', JSON.stringify(externalResources));
    } catch {
      // ignore storage quota errors
    }
  }, [
    pathways,
    tubeHardwareList,
    learningModules,
    procedureSims,
    courseFeedbackLogs,
    websiteFeedbackLogs,
    externalResources
  ]);

  // Global Search State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Pathway Runner State
  const [selectedPathwayId, setSelectedPathwayId] = useState(null);
  const [pathwayStepIdx, setPathwayStepIdx] = useState(0);
  const [pathwayTimerSec, setPathwayTimerSec] = useState(0);

  // Quick-Access Modals
  const [showPreAlertModal, setShowPreAlertModal] = useState(false);
  const [showTubeIdModal, setShowTubeIdModal] = useState(false);
  const [highlightedTubeId, setHighlightedTubeId] = useState(null);
  const [showTroubleshootModal, setShowTroubleshootModal] = useState(false);
  const [selectedTroubleshootId, setSelectedTroubleshootId] = useState(null);
  const [showSizerModal, setShowSizerModal] = useState(false);
  const [selectedTubeIdSize, setSelectedTubeIdSize] = useState('4.0');
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [bagChecked, setBagChecked] = useState({});

  // A&E Pre-Alert SBAR Builder State
  const [sbarAge, setSbarAge] = useState('4 years');
  const [sbarTubeSize, setSbarTubeSize] = useState('4.0 mm Bivona TTS');
  const [sbarUpperAirway, setSbarUpperAirway] = useState('Patent (Green Sign)');
  const [sbarStatus, setSbarStatus] = useState('Tube changed roadside; SpO2 96% on O2');
  const [sbarEta, setSbarEta] = useState('8 mins');
  const [sbarCopied, setSbarCopied] = useState(false);

  // Learning Modules State
  const [moduleSettingFilter, setModuleSettingFilter] = useState('all'); // 'all' | 'pre-hospital' | 'in-patient' | 'community'
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const [moduleNightMode, setModuleNightMode] = useState(false);
  const [moduleLargeText, setModuleLargeText] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [miniCaseRevealed, setMiniCaseRevealed] = useState({});
  const [completedModules, setCompletedModules] = useState({});

  // Course Feedback, Website Feedback & External Resources Modal State
  const [showCourseFeedbackModal, setShowCourseFeedbackModal] = useState(false);
  const [courseFeedbackSaved, setCourseFeedbackSaved] = useState(false);
  const [courseFeedbackDraft, setCourseFeedbackDraft] = useState({
    moduleTitle: 'All Learning Modules (Overall Curriculum)',
    relevanceRating: 5,
    qualityRating: 5,
    objectivesRating: 5,
    overallRating: 5,
    comments: ''
  });

  const [showWebsiteFeedbackModal, setShowWebsiteFeedbackModal] = useState(false);
  const [websiteFeedbackSaved, setWebsiteFeedbackSaved] = useState(false);
  const [websiteFeedbackDraft, setWebsiteFeedbackDraft] = useState({
    category: 'Bug / Display Issue',
    area: 'Homepage / Navigation',
    message: ''
  });

  const [showResourcesModal, setShowResourcesModal] = useState(false);
  // PROCEDURE SIMULATOR STATE & REFS
  // ==========================================
  const [activeSimId, setActiveSimId] = useState('sim-cric');
  const [simAgeGroup, setSimAgeGroup] = useState('child'); // 'infant' | 'child' | 'adolescent'
  const [simViewMode, setSimViewMode] = useState('interactive'); // 'interactive' | 'overview'
  const [simPracticeStyle, setSimPracticeStyle] = useState('guided'); // 'guided' | 'exam'
  const [simStepIndex, setSimStepIndex] = useState(0);
  const [selectedSimTool, setSelectedSimTool] = useState('tool-hands');
  const [simCompletedSteps, setSimCompletedSteps] = useState({});
  const [simMistakesCount, setSimMistakesCount] = useState(0);
  const [simElapsedSec, setSimElapsedSec] = useState(0);
  const [showSimLabels, setShowSimLabels] = useState(true);
  const [simShowMeHint, setSimShowMeHint] = useState(false);
  const [simFeedbackBanner, setSimFeedbackBanner] = useState(null);
  const [simDragActive, setSimDragActive] = useState(false);
  const [simStrokePoints, setSimStrokePoints] = useState([]);
  const [simActionProgress, setSimActionProgress] = useState(0);
  const [simDisclaimerAccepted, setSimDisclaimerAccepted] = useState(false);
  const [simDeclarationChecked, setSimDeclarationChecked] = useState(false);
  const [simComplicationsEnabled, setSimComplicationsEnabled] = useState(true);
  const [activeSimComplication, setActiveSimComplication] = useState(null);
  const [complicationResolvedIds, setComplicationResolvedIds] = useState({});
  const [complicationChoiceIdx, setComplicationChoiceIdx] = useState(null);

  // Zero-lag Direct DOM Refs for Procedure Sim
  const simSvgRef = useRef(null);
  const simCursorOverlayRef = useRef(null);
  const simDragActiveRef = useRef(false);
  const simStrokeRef = useRef([]);
  const simPaintedRef = useRef({});
  const simProgressRef = useRef(0);
  const simLivePolylineRef = useRef(null);
  const simLiveAdvanceLineRef = useRef(null);
  const simLiveProgressTextRef = useRef(null);
  const simSyringeGroupRef = useRef(null);
  const simBubblesGroupRef = useRef(null);
  const simHoldCircleRef = useRef(null);

  // ==========================================
  // ADMIN CONTENT MANAGER STATE
  // ==========================================
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isAdminSignedIn, setIsAdminSignedIn] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState('ent.lead@nhs.net');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminTab, setAdminTab] = useState('tube-id'); // 'tube-id' | 'sims' | 'feedback' | 'resources'
  const [adminFeedbackSubTab, setAdminFeedbackSubTab] = useState('course'); // 'course' | 'website'
  const [resourceForm, setResourceForm] = useState({
    title: '',
    organisation: '',
    category: 'Emergency Guidelines',
    url: '',
    description: ''
  });

  // Admin Tube ID Editor State
  const [editingTubeId, setEditingTubeId] = useState(null);
  const [tubeForm, setTubeForm] = useState({
    name: '',
    manufacturer: '',
    cuffType: '',
    innerCannula: '',
    visualCues: '',
    roadsideAction: '',
    photoUrl: ''
  });

  // Admin Procedure Sim Designer State
  const [adminSimId, setAdminSimId] = useState('sim-cric');
  const [newSimTitle, setNewSimTitle] = useState('');
  const [newSimSubtitle, setNewSimSubtitle] = useState('');
  const [adminSelectedStepIdx, setAdminSelectedStepIdx] = useState(0);
  const [stepForm, setStepForm] = useState({
    phase: '1. Preparation',
    title: '',
    instruction: '',
    traineeTip: '',
    requiredTool: 'tool-hands',
    interactionType: 'tap',
    ageFilter: 'all',
    targetX: 250,
    targetY: 180,
    targetR: 28
  });

  // ==========================================
  // DERIVED MEMOS (TOP-LEVEL HOOKS)
  // ==========================================

  const activePathway = useMemo(
    () => pathways.find((p) => p.id === selectedPathwayId) || null,
    [pathways, selectedPathwayId]
  );

  const coreEmergencyPathways = useMemo(
    () => pathways.filter((p) => p.placement !== 'extra'),
    [pathways]
  );

  const extraRoutinePathways = useMemo(
    () => pathways.filter((p) => p.placement === 'extra'),
    [pathways]
  );

  const currentSizingRow = useMemo(
    () => SUCTION_SIZING_TABLE.find((r) => r.id === selectedTubeIdSize) || SUCTION_SIZING_TABLE[3],
    [selectedTubeIdSize]
  );

  const activeModule = useMemo(
    () => learningModules.find((m) => m.id === activeModuleId) || null,
    [learningModules, activeModuleId]
  );

  const filteredLearningModules = useMemo(() => {
    if (moduleSettingFilter === 'all') return learningModules;
    return learningModules.filter((m) =>
      (m.settingTags || ['pre-hospital', 'in-patient', 'community']).includes(moduleSettingFilter)
    );
  }, [learningModules, moduleSettingFilter]);

  const activeSim = useMemo(
    () => procedureSims.find((s) => s.id === activeSimId) || procedureSims[0] || null,
    [procedureSims, activeSimId]
  );

  const visibleSimSteps = useMemo(() => {
    if (!activeSim) return [];
    return (activeSim.steps || []).filter((st) => {
      const groups =
        Array.isArray(st.ageGroups) && st.ageGroups.length > 0
          ? st.ageGroups
          : ['all'];
      if (activeSim.supportsAgeSwitch === false) return true;
      return groups.includes('all') || groups.includes(simAgeGroup);
    });
  }, [activeSim, simAgeGroup]);

  const adminSelectedSim = useMemo(
    () => procedureSims.find((s) => s.id === adminSimId) || procedureSims[0] || null,
    [procedureSims, adminSimId]
  );

  // Global Search Memo (Pathways, Steps, Modules, Tube ID, Airway Troubleshooting)
  const searchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) {
      return { pathways: [], steps: [], modules: [], hardware: [], troubleshoot: [] };
    }
    const matchedPathways = pathways.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
    const matchedSteps = [];
    pathways.forEach((p) => {
      (p.steps || []).forEach((st, idx) => {
        if (
          st.title.toLowerCase().includes(q) ||
          st.action.toLowerCase().includes(q) ||
          st.details.toLowerCase().includes(q)
        ) {
          matchedSteps.push({ pathwayId: p.id, pathwayTitle: p.title, stepIdx: idx, step: st });
        }
      });
    });
    const matchedModules = learningModules.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        (m.sections || []).some(
          (s) => s.heading.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)
        )
    );
    const matchedHardware = tubeHardwareList.filter(
      (hw) =>
        hw.name.toLowerCase().includes(q) ||
        hw.manufacturer.toLowerCase().includes(q) ||
        hw.cuffType.toLowerCase().includes(q) ||
        hw.visualCues.toLowerCase().includes(q) ||
        hw.roadsideAction.toLowerCase().includes(q)
    );
    const matchedTroubleshoot = INITIAL_TROUBLESHOOT_ITEMS.filter(
      (ts) =>
        ts.symptom.toLowerCase().includes(q) ||
        ts.likelyCauses.some((c) => c.toLowerCase().includes(q)) ||
        ts.immediateActions.some((a) => a.toLowerCase().includes(q))
    );

    return {
      pathways: matchedPathways,
      steps: matchedSteps.slice(0, 6),
      modules: matchedModules,
      hardware: matchedHardware,
      troubleshoot: matchedTroubleshoot
    };
  }, [globalSearchQuery, pathways, learningModules, tubeHardwareList]);

  // ==========================================
  // TIMERS & PROCEDURE SIM EFFECTS
  // ==========================================

  // Firebase Anonymous Auth & Admin Session Listener
  useEffect(() => {
    if (!auth) {
      setCloudStatus('offline');
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try {
          await signInAnonymously(auth);
        } catch {
          setCloudStatus('offline');
        }
        return;
      }
      setFbUser(u);
      if (!u.isAnonymous && u.email) {
        setIsAdminSignedIn(true);
      }
    });
    return () => unsub();
  }, []);

  // Real-Time Cloud Firestore Sync (with Automatic Offline localStorage Fallback)
  useEffect(() => {
    if (!fbUser || !db) return;
    const bundleRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'paedtrach_cms',
      'live_bundle'
    );
    const unsub = onSnapshot(
      bundleRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          try {
            if (data.tubeHardwareJson) {
              const parsedHw = JSON.parse(data.tubeHardwareJson);
              if (Array.isArray(parsedHw) && parsedHw.length > 0) setTubeHardwareList(parsedHw);
            }
            if (data.procedureSimsJson) {
              const parsedSims = JSON.parse(data.procedureSimsJson);
              if (Array.isArray(parsedSims) && parsedSims.length > 0) setProcedureSims(parsedSims);
            }
            if (data.courseFeedbackJson) {
              setCourseFeedbackLogs(filterWithinSixMonths(JSON.parse(data.courseFeedbackJson)));
            }
            if (data.websiteFeedbackJson) {
              setWebsiteFeedbackLogs(filterWithinSixMonths(JSON.parse(data.websiteFeedbackJson)));
            }
            if (data.externalResourcesJson) {
              const parsedRes = JSON.parse(data.externalResourcesJson);
              if (Array.isArray(parsedRes)) setExternalResources(parsedRes);
            }
          } catch {
            // Keep local cache if parse fails
          }
        }
        setCloudStatus('synced');
      },
      () => setCloudStatus('offline')
    );
    return () => unsub();
  }, [fbUser]);

  const syncBundleToCloud = async (overrides = {}) => {
    if (!db || !fbUser) return;
    try {
      const bundleRef = doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'paedtrach_cms',
        'live_bundle'
      );
      const payload = {
        updatedAt: new Date().toISOString()
      };
      if (overrides.tubeHardwareList) {
        payload.tubeHardwareJson = JSON.stringify(overrides.tubeHardwareList);
      }
      if (overrides.procedureSims) {
        payload.procedureSimsJson = JSON.stringify(overrides.procedureSims);
      }
      if (overrides.courseFeedbackLogs) {
        payload.courseFeedbackJson = JSON.stringify(
          filterWithinSixMonths(overrides.courseFeedbackLogs)
        );
      }
      if (overrides.websiteFeedbackLogs) {
        payload.websiteFeedbackJson = JSON.stringify(
          filterWithinSixMonths(overrides.websiteFeedbackLogs)
        );
      }
      if (overrides.externalResources) {
        payload.externalResourcesJson = JSON.stringify(overrides.externalResources);
      }
      await setDoc(bundleRef, payload, { merge: true });
      setCloudStatus('synced');
    } catch {
      setCloudStatus('offline');
    }
  };

  // Pathway emergency elapsed timer
  useEffect(() => {
    if (!selectedPathwayId) {
      setPathwayTimerSec(0);
      return;
    }
    const id = setInterval(() => setPathwayTimerSec((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [selectedPathwayId]);

  // Procedure Sim elapsed timer
  useEffect(() => {
    if (
      activeTopTab !== 'learning' ||
      learningSectionTab !== 'simulator' ||
      !simDisclaimerAccepted ||
      simViewMode !== 'interactive' ||
      !activeSim
    ) {
      return;
    }
    const allDone =
      visibleSimSteps.length > 0 &&
      visibleSimSteps.every((st) => !!simCompletedSteps[`${activeSim.id}-${st.id}`]);
    if (allDone) return;

    const id = setInterval(() => setSimElapsedSec((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [
    activeTopTab,
    learningSectionTab,
    simDisclaimerAccepted,
    simViewMode,
    activeSim,
    visibleSimSteps,
    simCompletedSteps
  ]);

  // Reset gesture buffers cleanly whenever step, sim, or age group changes
  useEffect(() => {
    simDragActiveRef.current = false;
    simStrokeRef.current = [];
    simPaintedRef.current = {};
    simProgressRef.current = 0;
    if (simLivePolylineRef.current) simLivePolylineRef.current.setAttribute('points', '');
    if (simLiveProgressTextRef.current) simLiveProgressTextRef.current.textContent = '0%';
    if (simBubblesGroupRef.current) simBubblesGroupRef.current.setAttribute('opacity', '0');
    if (simHoldCircleRef.current) simHoldCircleRef.current.setAttribute('opacity', '0');
    setSimDragActive(false);
    setSimStrokePoints([]);
    setSimActionProgress(0);
  }, [activeSimId, simStepIndex, simAgeGroup]);

  // Press & Hold progress interval for 'hold' steps
  useEffect(() => {
    if (!simDragActive || !activeSim) return;
    const safeIdx = Math.min(simStepIndex, Math.max(0, visibleSimSteps.length - 1));
    const stepObj = visibleSimSteps[safeIdx];
    if (!stepObj || stepObj.interactionType !== 'hold') return;

    const stepKey = `${activeSim.id}-${stepObj.id}`;
    if (simCompletedSteps[stepKey]) return;

    const timer = setInterval(() => {
      const next = Math.min(100, simProgressRef.current + 8);
      simProgressRef.current = next;
      if (simLiveProgressTextRef.current) {
        simLiveProgressTextRef.current.textContent = `${next}%`;
      }
      if (simHoldCircleRef.current && stepObj.targetZone) {
        const r = stepObj.targetZone.r + 4;
        const circ = 2 * Math.PI * r;
        simHoldCircleRef.current.setAttribute('stroke-dasharray', String(circ));
        simHoldCircleRef.current.setAttribute(
          'stroke-dashoffset',
          String(circ * (1 - next / 100))
        );
        simHoldCircleRef.current.setAttribute('opacity', '1');
      }
      if (next >= 100) {
        clearInterval(timer);
        simDragActiveRef.current = false;
        setSimCompletedSteps((p) => ({ ...p, [stepKey]: true }));
        setSimActionProgress(100);
        setSimShowMeHint(false);
        setSimDragActive(false);
        setSimFeedbackBanner({
          type: 'success',
          text: `✓ Step ${safeIdx + 1} completed! ${
            safeIdx < visibleSimSteps.length - 1
              ? 'Tap Next to continue.'
              : 'All procedure steps completed — SpO2 & EtCO2 restored!'
          }`
        });
      }
    }, 75);

    return () => clearInterval(timer);
  }, [simDragActive, activeSim, simStepIndex, visibleSimSteps, simCompletedSteps]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleSimAgeGroupChange = (newAgeId) => {
    setSimAgeGroup(newAgeId);
    setSimStepIndex(0);
    setSimCompletedSteps({});
    setSimMistakesCount(0);
    setSimElapsedSec(0);
    setActiveSimComplication(null);
    setComplicationResolvedIds({});
    setComplicationChoiceIdx(null);
    setSimFeedbackBanner(null);
    setSimShowMeHint(false);

    const nextSteps = (activeSim?.steps || []).filter((st) => {
      const groups =
        Array.isArray(st.ageGroups) && st.ageGroups.length > 0 ? st.ageGroups : ['all'];
      return groups.includes('all') || groups.includes(newAgeId);
    });
    if (nextSteps[0]?.requiredTool) {
      setSelectedSimTool(nextSteps[0].requiredTool);
    }
  };

  const handleCopySbar = () => {
    const text = `A&E PAEDIATRIC TRACHEOSTOMY PRE-ALERT (SBAR)
Age: ${sbarAge}
Tracheostomy Tube: ${sbarTubeSize}
Upper Airway: ${sbarUpperAirway}
Current Clinical Status: ${sbarStatus}
ETA to Resus: ${sbarEta}
Request: Paediatric Airway / ENT team standby on arrival.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setSbarCopied(true);
    setTimeout(() => setSbarCopied(false), 2500);
  };

  const handlePhotoFileUpload = (file, onLoaded) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = ev.target?.result;
      if (typeof rawDataUrl !== 'string') return;
      // Compress uploaded photo on canvas so it stores compactly offline without Wi-Fi
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 760;
          const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            onLoaded(canvas.toDataURL('image/jpeg', 0.78));
            return;
          }
        } catch {
          // fallback to original data URL
        }
        onLoaded(rawDataUrl);
      };
      img.onerror = () => onLoaded(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitCourseFeedback = (e) => {
    e.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    const entry = {
      id: `cfb-${Date.now()}`,
      submittedAt: today,
      moduleTitle: courseFeedbackDraft.moduleTitle,
      relevanceRating: Number(courseFeedbackDraft.relevanceRating),
      qualityRating: Number(courseFeedbackDraft.qualityRating),
      objectivesRating: Number(courseFeedbackDraft.objectivesRating),
      overallRating: Number(courseFeedbackDraft.overallRating),
      comments: courseFeedbackDraft.comments.trim()
    };
    const nextLogs = filterWithinSixMonths([entry, ...courseFeedbackLogs]);
    setCourseFeedbackLogs(nextLogs);
    syncBundleToCloud({ courseFeedbackLogs: nextLogs });
    setCourseFeedbackSaved(true);
    setTimeout(() => {
      setShowCourseFeedbackModal(false);
      setCourseFeedbackSaved(false);
      setCourseFeedbackDraft((prev) => ({ ...prev, comments: '' }));
    }, 1200);
  };

  const handleSubmitWebsiteFeedback = (e) => {
    e.preventDefault();
    if (!websiteFeedbackDraft.message.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const entry = {
      id: `wfb-${Date.now()}`,
      submittedAt: today,
      category: websiteFeedbackDraft.category,
      area: websiteFeedbackDraft.area,
      message: websiteFeedbackDraft.message.trim()
    };
    const nextLogs = filterWithinSixMonths([entry, ...websiteFeedbackLogs]);
    setWebsiteFeedbackLogs(nextLogs);
    syncBundleToCloud({ websiteFeedbackLogs: nextLogs });
    setWebsiteFeedbackSaved(true);
    setTimeout(() => {
      setShowWebsiteFeedbackModal(false);
      setWebsiteFeedbackSaved(false);
      setWebsiteFeedbackDraft({
        category: 'Bug / Display Issue',
        area: 'Homepage / Navigation',
        message: ''
      });
    }, 1200);
  };

  const handleAddExternalResource = (e) => {
    e.preventDefault();
    if (!resourceForm.title.trim() || !resourceForm.url.trim()) return;
    const item = {
      id: `res-${Date.now()}`,
      title: resourceForm.title.trim(),
      organisation: resourceForm.organisation.trim() || 'Clinical Resource',
      category: resourceForm.category.trim() || 'Reference',
      url: resourceForm.url.trim(),
      description: resourceForm.description.trim()
    };
    const nextResources = [item, ...externalResources];
    setExternalResources(nextResources);
    syncBundleToCloud({ externalResources: nextResources });
    setResourceForm({
      title: '',
      organisation: '',
      category: 'Emergency Guidelines',
      url: '',
      description: ''
    });
  };

  const handleSaveTubeItem = (e) => {
    e.preventDefault();
    if (!tubeForm.name.trim()) return;
    const itemObj = {
      id: editingTubeId || `tube-${Date.now()}`,
      name: tubeForm.name.trim(),
      manufacturer: tubeForm.manufacturer.trim() || 'Paediatric Airway',
      cuffType: tubeForm.cuffType.trim() || 'Uncuffed',
      innerCannula: tubeForm.innerCannula.trim() || 'No inner cannula',
      visualCues: tubeForm.visualCues.trim(),
      roadsideAction: tubeForm.roadsideAction.trim(),
      photoUrl: tubeForm.photoUrl || ''
    };
    const nextList = editingTubeId
      ? tubeHardwareList.map((item) => (item.id === editingTubeId ? itemObj : item))
      : [...tubeHardwareList, itemObj];
    setTubeHardwareList(nextList);
    syncBundleToCloud({ tubeHardwareList: nextList });
    setEditingTubeId(null);
    setTubeForm({
      name: '',
      manufacturer: '',
      cuffType: '',
      innerCannula: '',
      visualCues: '',
      roadsideAction: '',
      photoUrl: ''
    });
  };

  const handleCreateCustomSim = (e) => {
    e.preventDefault();
    if (!newSimTitle.trim()) return;
    const id = `sim-custom-${Date.now()}`;
    const newSim = {
      id,
      title: newSimTitle.trim(),
      badge: 'Custom ENT Sim',
      subtitle: newSimSubtitle.trim() || 'Custom clinical procedure simulation',
      diagramType: 'builtin-neck',
      customDiagramUrl: '',
      supportsAgeSwitch: true,
      disclaimer:
        'Educational simulation only. Always check current local NHS Trust / JRCALC / NTSP protocols.',
      tools: INITIAL_PROCEDURE_SIMS[0].tools,
      steps: [
        {
          id: `${id}-st-1`,
          phase: '1. Landmarking',
          title: 'Initial Assessment & Landmarking',
          instruction: 'Select Palpate and hold on the target anatomical zone.',
          traineeTip: 'Edit this step or click on the diagram to reposition the target.',
          requiredTool: 'tool-hands',
          interactionType: 'hold',
          ageGroups: ['all'],
          targetZone: { x: 250, y: 175, r: 30, label: 'Target Zone' },
          demoHint: 'Hold on the highlighted target zone.'
        }
      ]
    };
    const nextSims = [...procedureSims, newSim];
    setProcedureSims(nextSims);
    syncBundleToCloud({ procedureSims: nextSims });
    setAdminSimId(id);
    setNewSimTitle('');
    setNewSimSubtitle('');
  };

  const mapAgeFilterToArray = (filterKey) => {
    if (filterKey === 'infant-child') return ['infant', 'child'];
    if (filterKey === 'infant') return ['infant'];
    if (filterKey === 'child') return ['child'];
    if (filterKey === 'adolescent') return ['adolescent'];
    return ['all'];
  };

  const handleAddStepToAdminSim = (e) => {
    e.preventDefault();
    if (!adminSelectedSim || !stepForm.title.trim()) return;
    const newStep = {
      id: `st-${Date.now()}`,
      phase: stepForm.phase || '1. Procedure',
      title: stepForm.title.trim(),
      instruction: stepForm.instruction.trim() || 'Perform the required step on the highlighted zone.',
      traineeTip: stepForm.traineeTip.trim(),
      requiredTool: stepForm.requiredTool || 'tool-hands',
      interactionType: stepForm.interactionType || 'tap',
      ageGroups: mapAgeFilterToArray(stepForm.ageFilter),
      targetZone: {
        x: Number(stepForm.targetX) || 250,
        y: Number(stepForm.targetY) || 180,
        r: Number(stepForm.targetR) || 28,
        label: stepForm.title.trim()
      },
      dragStart:
        stepForm.interactionType === 'draw' || stepForm.interactionType === 'advance'
          ? { x: Number(stepForm.targetX) || 250, y: Math.max(40, (Number(stepForm.targetY) || 180) - 25) }
          : undefined,
      dragEnd:
        stepForm.interactionType === 'draw' || stepForm.interactionType === 'advance'
          ? { x: Number(stepForm.targetX) || 250, y: Math.min(310, (Number(stepForm.targetY) || 180) + 35) }
          : undefined,
      demoHint: `Complete ${stepForm.title.trim()} at the highlighted anatomical landmark.`
    };
    const nextSims = procedureSims.map((s) =>
      s.id === adminSelectedSim.id ? { ...s, steps: [...s.steps, newStep] } : s
    );
    setProcedureSims(nextSims);
    syncBundleToCloud({ procedureSims: nextSims });
    setStepForm((prev) => ({ ...prev, title: '', instruction: '', traineeTip: '' }));
  };

  const hasAnySearchResults =
    searchResults.pathways.length > 0 ||
    searchResults.steps.length > 0 ||
    searchResults.modules.length > 0 ||
    searchResults.hardware.length > 0 ||
    searchResults.troubleshoot.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* ==========================================
          TOP NAVIGATION BAR
         ========================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand */}
          <button
            type="button"
            onClick={() => {
              setActiveTopTab('pathways');
              setSelectedPathwayId(null);
              setOnCallSubView('main');
            }}
            className="flex items-center gap-2.5 text-left shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-slate-900">
                  PaedTraches
                </span>
                <span
                  className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    cloudStatus === 'synced'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  <Cloud className="w-3 h-3" />
                  <span>{cloudStatus === 'synced' ? 'Cloud Live' : 'Offline Ready'}</span>
                </span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 hidden sm:block">
                Paediatric Airway &amp; ENT Guide
              </div>
            </div>
          </button>

          {/* Two Clean Top-Level Headings: On-Call Pathways & Learning */}
          <nav className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTopTab('pathways')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition ${
                activeTopTab === 'pathways'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              On-Call Pathways
            </button>
            <button
              type="button"
              onClick={() => setActiveTopTab('learning')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition ${
                activeTopTab === 'learning'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Learning
            </button>
          </nav>

          {/* Search & Admin */}
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block w-56 lg:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={globalSearchQuery}
                onFocus={() => setShowSearchDropdown(true)}
                onChange={(e) => {
                  setGlobalSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                placeholder="Search pathways, Bivona, PMV..."
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none transition"
              />
              {globalSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setGlobalSearchQuery('');
                    setShowSearchDropdown(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Search Results Dropdown */}
              {showSearchDropdown && globalSearchQuery.trim() && (
                <div className="absolute right-0 mt-2 w-96 max-h-[420px] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-3 space-y-3 z-50">
                  {!hasAnySearchResults ? (
                    <p className="text-xs text-slate-500 text-center py-4">
                      No matches found for &ldquo;{globalSearchQuery}&rdquo;.
                    </p>
                  ) : (
                    <>
                      {searchResults.hardware.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 px-2">
                            Tube &amp; Hardware ID
                          </div>
                          {searchResults.hardware.map((hw) => (
                            <button
                              key={hw.id}
                              type="button"
                              onClick={() => {
                                setHighlightedTubeId(hw.id);
                                setShowTubeIdModal(true);
                                setShowSearchDropdown(false);
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-emerald-50 transition"
                            >
                              <div className="text-xs font-bold text-slate-900">{hw.name}</div>
                              <div className="text-[11px] text-slate-500 truncate">{hw.cuffType}</div>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.troubleshoot.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 px-2">
                            Airway Troubleshooting
                          </div>
                          {searchResults.troubleshoot.map((ts) => (
                            <button
                              key={ts.id}
                              type="button"
                              onClick={() => {
                                setSelectedTroubleshootId(ts.id);
                                setShowTroubleshootModal(true);
                                setShowSearchDropdown(false);
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-rose-50 transition"
                            >
                              <div className="text-xs font-bold text-slate-900">{ts.symptom}</div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {ts.immediateActions[0]}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.pathways.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 px-2">
                            On-Call Pathways
                          </div>
                          {searchResults.pathways.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setActiveTopTab('pathways');
                                setSelectedPathwayId(p.id);
                                setPathwayStepIdx(0);
                                setShowSearchDropdown(false);
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-indigo-50 transition"
                            >
                              <div className="text-xs font-bold text-slate-900">{p.title}</div>
                              <div className="text-[11px] text-slate-500 truncate">{p.summary}</div>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.modules.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 px-2">
                            Learning Modules
                          </div>
                          {searchResults.modules.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setActiveTopTab('learning');
                                setLearningSectionTab('modules');
                                setActiveModuleId(m.id);
                                setShowSearchDropdown(false);
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-amber-50 transition"
                            >
                              <div className="text-xs font-bold text-slate-900">{m.title}</div>
                              <div className="text-[11px] text-slate-500 truncate">{m.summary}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Admin Content Manager"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Search Strip */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={globalSearchQuery}
            onChange={(e) => {
              setGlobalSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            placeholder="Search pathways, Bivona, Shiley, bleeding..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none"
          />
          {globalSearchQuery && (
            <button
              type="button"
              onClick={() => setGlobalSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {globalSearchQuery.trim() && hasAnySearchResults && (
          <div className="mt-2 bg-slate-50 rounded-xl border border-slate-200 p-2 space-y-1.5 max-h-52 overflow-y-auto">
            {searchResults.hardware.map((hw) => (
              <button
                key={hw.id}
                type="button"
                onClick={() => {
                  setHighlightedTubeId(hw.id);
                  setShowTubeIdModal(true);
                  setGlobalSearchQuery('');
                }}
                className="w-full text-left p-2 rounded-lg bg-white border border-slate-100 text-xs"
              >
                <span className="text-[10px] font-bold text-emerald-700 mr-1.5">TUBE ID</span>
                <span className="font-semibold text-slate-900">{hw.name}</span>
              </button>
            ))}
            {searchResults.troubleshoot.map((ts) => (
              <button
                key={ts.id}
                type="button"
                onClick={() => {
                  setSelectedTroubleshootId(ts.id);
                  setShowTroubleshootModal(true);
                  setGlobalSearchQuery('');
                }}
                className="w-full text-left p-2 rounded-lg bg-white border border-slate-100 text-xs"
              >
                <span className="text-[10px] font-bold text-rose-700 mr-1.5">TROUBLESHOOT</span>
                <span className="font-semibold text-slate-900">{ts.symptom}</span>
              </button>
            ))}
            {searchResults.pathways.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActiveTopTab('pathways');
                  setSelectedPathwayId(p.id);
                  setPathwayStepIdx(0);
                  setGlobalSearchQuery('');
                }}
                className="w-full text-left p-2 rounded-lg bg-white border border-slate-100 text-xs"
              >
                <span className="text-[10px] font-bold text-indigo-700 mr-1.5">PATHWAY</span>
                <span className="font-semibold text-slate-900">{p.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ==========================================
          MAIN CONTENT AREA
         ========================================== */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* 1. ON-CALL PATHWAYS TAB */}
        {activeTopTab === 'pathways' && (
          <div className="space-y-6">
            {/* Active Emergency Pathway Runner OR Restored Homepage Hub */}
            {activePathway ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedPathwayId(null)}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                    >
                      ← Back to On-Call Pathways
                    </button>
                    <h2 className="text-lg sm:text-xl font-bold">{activePathway.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTubeIdModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300 transition"
                    >
                      Tube ID
                    </button>
                    <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono">
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                      <span>{formatTime(pathwayTimerSec)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                  {/* Step Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {activePathway.steps.map((st, idx) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setPathwayStepIdx(idx)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          idx === pathwayStepIdx
                            ? 'bg-emerald-600 text-white'
                            : idx < pathwayStepIdx
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Step {idx + 1}
                      </button>
                    ))}
                  </div>

                  {activePathway.steps[pathwayStepIdx] && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                          Step {pathwayStepIdx + 1} of {activePathway.steps.length}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                          {activePathway.steps[pathwayStepIdx].title}
                        </h3>
                        <p className="text-base font-semibold text-slate-800 bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl">
                          {activePathway.steps[pathwayStepIdx].action}
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {activePathway.steps[pathwayStepIdx].details}
                        </p>
                      </div>

                      {activePathway.steps[pathwayStepIdx].redFlag && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs sm:text-sm text-rose-950">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Critical Safety Pearl:</strong>{' '}
                            {activePathway.steps[pathwayStepIdx].redFlag}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={pathwayStepIdx === 0}
                          onClick={() => setPathwayStepIdx((i) => Math.max(0, i - 1))}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-bold text-slate-700"
                        >
                          Previous Step
                        </button>

                        {pathwayStepIdx < activePathway.steps.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => setPathwayStepIdx((i) => i + 1)}
                            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1"
                          >
                            <span>Next Step</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowPreAlertModal(true)}
                            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <ShieldAlert className="w-4 h-4" />
                            <span>Open A&amp;E Pre-Alert</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : onCallSubView === 'extra' ? (
              /* EXTRA PATHWAYS & ROUTINE CARE SUB-PAGE */
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setOnCallSubView('main')}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 py-1.5 px-3 rounded-xl hover:bg-slate-200/60 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Emergency Pathways</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    Extra Pathways &amp; Routine Care
                  </h1>
                  <p className="text-sm sm:text-base text-slate-500">
                    Secondary clinical pathways for decannulation, mucus plugging, sentinel bleeds, CICO, and ward stoma care.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {extraRoutinePathways.map((pathway) => {
                    const style = getPathwayThemeStyles(pathway.theme);
                    return (
                      <button
                        key={pathway.id}
                        type="button"
                        onClick={() => {
                          setSelectedPathwayId(pathway.id);
                          setPathwayStepIdx(0);
                        }}
                        className={`w-full text-left bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 group ${style.topBar} ${style.cardHover}`}
                      >
                        <div className="space-y-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {pathway.category}
                          </span>
                          <h3 className="text-lg font-bold text-slate-900">{pathway.title}</h3>
                          <p className="text-sm text-slate-500">{pathway.summary}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-700 shrink-0 transition">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* RESTORED PAEDTRACHES CLINICAL GUIDE HOMEPAGE LAYOUT */
              <div className="space-y-8 sm:space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/80 pb-5">
                  <div className="space-y-1.5">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
                      PaedTraches Clinical Guide
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500">
                      Select an emergency clinical pathway or open a roadside decision &amp; handover aid.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSizerModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition"
                    >
                      <Calculator className="w-4 h-4 text-emerald-600" />
                      <span>Tube Sizer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHighlightedTubeId(null);
                        setShowTubeIdModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold transition"
                    >
                      <Package className="w-4 h-4 text-indigo-600" />
                      <span>Tube ID</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTroubleshootId(null);
                        setShowTroubleshootModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold transition"
                    >
                      <Wrench className="w-4 h-4 text-rose-600" />
                      <span>Airway Troubleshooting</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowChecklistModal(true)}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold transition"
                    >
                      <ClipboardCheck className="w-4 h-4 text-sky-600" />
                      <span>Go-Bag Check</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPreAlertModal(true)}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition"
                    >
                      <Radio className="w-4 h-4 text-amber-600" />
                      <span>A&amp;E Pre-Alert</span>
                    </button>
                  </div>
                </div>

                {/* Core Emergency Pathway Cards (3-Column Grid) */}
                <div className="space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Core Emergency Pathways
                  </h2>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                    {coreEmergencyPathways.map((pathway) => {
                      const style = getPathwayThemeStyles(pathway.theme);
                      return (
                        <button
                          key={pathway.id}
                          type="button"
                          onClick={() => {
                            setSelectedPathwayId(pathway.id);
                            setPathwayStepIdx(0);
                          }}
                          className={`w-full text-left bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-5 group ${style.topBar} ${style.cardHover}`}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.pill}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                {pathway.category}
                              </span>
                              <span className="text-[11px] font-medium text-slate-400">
                                {pathway.steps.length} steps
                              </span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-slate-950">
                              {pathway.title}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                              {pathway.summary}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between w-full text-xs font-semibold text-slate-600 group-hover:text-slate-900">
                            <span>Open Interactive Pathway</span>
                            <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-700 transition">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Row: Secondary & Routine Care + Quick Roadside Tools & Hardware Aids */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
                  <div className="lg:col-span-5 space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Secondary &amp; Routine Care
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setOnCallSubView('extra');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full h-[calc(100%-1.75rem)] text-left bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-base">
                              Extra Pathways &amp; Routine Care
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {extraRoutinePathways.length} available
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                            Accidental decannulation, mucus plugging, sentinel bleeds, CICO &amp; stoma care
                          </p>
                        </div>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-700 shrink-0 transition">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </button>
                  </div>

                  <div className="lg:col-span-7 space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Quick Roadside Tools &amp; Hardware Aids
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 h-[calc(100%-1.75rem)]">
                      <button
                        type="button"
                        onClick={() => setShowSizerModal(true)}
                        className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between text-left group gap-2.5"
                      >
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0">
                          <Calculator className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">
                            Tube &amp; Suction Sizer
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Fr catheter &amp; safe depth
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setHighlightedTubeId(null);
                          setShowTubeIdModal(true);
                        }}
                        className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between text-left group gap-2.5"
                      >
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">
                            Tube &amp; Valve ID
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Shiley, Bivona TTS &amp; valves
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTroubleshootId(null);
                          setShowTroubleshootModal(true);
                        }}
                        className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between text-left group gap-2.5"
                      >
                        <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center shrink-0">
                          <Wrench className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">
                            Airway Troubleshooting
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            High pressure, bleeding &amp; leaks
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowChecklistModal(true)}
                        className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between text-left group gap-2.5"
                      >
                        <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200/60 text-sky-600 flex items-center justify-center shrink-0">
                          <ClipboardCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">
                            Go-Bag Checklist
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Verify kit prior to transit
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowPreAlertModal(true)}
                        className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between text-left group gap-2.5 col-span-2 sm:col-span-2"
                      >
                        <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center shrink-0">
                          <Radio className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">
                            A&amp;E Pre-Alert Builder
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            1-tap SBAR / ENT pre-alert summary
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. LEARNING TAB (MODULES & PROCEDURE SIM) */}
        {activeTopTab === 'learning' && (
          <div className="space-y-6">
            {/* Learning Sub-Navigation Switcher */}
            {!activeModule && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setLearningSectionTab('modules')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                      learningSectionTab === 'modules'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-sky-600" />
                    <span>Learning Modules ({learningModules.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLearningSectionTab('simulator')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                      learningSectionTab === 'simulator'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-indigo-600" />
                    <span>Procedure Sim ({procedureSims.length})</span>
                  </button>
                </div>

                {learningSectionTab === 'modules' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLearningSectionTab('simulator')}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-bold inline-flex items-center gap-1.5 transition"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Try Hands-On Procedure Sim</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResourcesModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold inline-flex items-center gap-1.5 transition"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>External Resources</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCourseFeedbackDraft((prev) => ({
                          ...prev,
                          moduleTitle: 'All Learning Modules (Overall Curriculum)'
                        }));
                        setShowCourseFeedbackModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold inline-flex items-center gap-1.5 transition"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      <span>Course Feedback</span>
                    </button>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                      {Object.keys(completedModules).length} / {learningModules.length} Completed
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2A. RESTORED LEARNING MODULES LAYOUT */}
            {learningSectionTab === 'modules' &&
              (activeModule ? (
                <div
                  className={`space-y-6 rounded-3xl transition-colors ${
                    moduleNightMode ? 'bg-slate-900 p-4 sm:p-6 border border-slate-800' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveModuleId(null)}
                      className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold py-1.5 px-3 rounded-xl transition ${
                        moduleNightMode
                          ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Modules</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setModuleLargeText((prev) => !prev)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                          moduleLargeText
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : moduleNightMode
                            ? 'bg-slate-800 border-slate-700 text-slate-200'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                        title="Toggle Larger Reading Text"
                      >
                        {moduleLargeText ? 'A-' : 'A+'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setModuleNightMode((prev) => !prev)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                          moduleNightMode
                            ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                        title="Toggle Night-Shift Low-Glare Reading Mode"
                      >
                        {moduleNightMode ? (
                          <>
                            <Sun className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Day Mode</span>
                          </>
                        ) : (
                          <>
                            <Moon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Night Shift</span>
                          </>
                        )}
                      </button>

                      <span
                        className={`text-xs font-semibold pl-1 ${
                          moduleNightMode ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        Section {activeSectionIndex + 1}/{activeModule.sections.length}
                      </span>
                    </div>
                  </div>

                  {/* Reading Progress Bar */}
                  <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{
                        width: `${
                          quizUnlocked
                            ? 100
                            : ((activeSectionIndex + 1) / activeModule.sections.length) * 100
                        }%`
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wider ${
                        moduleNightMode ? 'text-emerald-400' : 'text-emerald-700'
                      }`}
                    >
                      {activeModule.badge}
                    </span>
                    <h1
                      className={`text-2xl sm:text-3xl font-bold ${
                        moduleNightMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {activeModule.title}
                    </h1>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Desktop Sections Sidebar */}
                    <div className="hidden lg:block lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3 sticky top-24">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2.5">
                        Module Sections
                      </div>
                      <div className="space-y-1.5">
                        {activeModule.sections.map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setQuizUnlocked(false);
                              setActiveSectionIndex(idx);
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition flex items-center justify-between gap-2 ${
                              !quizUnlocked && activeSectionIndex === idx
                                ? 'bg-slate-900 text-white font-semibold'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span className="truncate">
                              {idx + 1}. {s.heading}
                            </span>
                            {!quizUnlocked && activeSectionIndex === idx && (
                              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </button>
                        ))}

                        <div className="pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setQuizUnlocked(true)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                              quizUnlocked
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            <span>Knowledge Check &amp; Mini-Case</span>
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Content Card */}
                    <div className="lg:col-span-8">
                      {!quizUnlocked && activeModule.sections[activeSectionIndex] && (
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
                          <div className="space-y-2">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                              Section {activeSectionIndex + 1}
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                              {activeModule.sections[activeSectionIndex].heading}
                            </h2>
                          </div>

                          <p
                            className={`text-slate-700 leading-relaxed ${
                              moduleLargeText ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
                            }`}
                          >
                            {activeModule.sections[activeSectionIndex].body}
                          </p>

                          {activeModule.sections[activeSectionIndex].pearl && (
                            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 font-medium flex items-start gap-2.5 text-xs sm:text-sm">
                              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div>
                                <strong>Clinical Takeaway:</strong>{' '}
                                {activeModule.sections[activeSectionIndex].pearl}
                              </div>
                            </div>
                          )}

                          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              disabled={activeSectionIndex === 0}
                              onClick={() => {
                                setActiveSectionIndex((i) => Math.max(0, i - 1));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              <span>Previous</span>
                            </button>

                            {activeSectionIndex < activeModule.sections.length - 1 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSectionIndex((i) => i + 1);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5"
                              >
                                <span>Next Section</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuizUnlocked(true);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm flex items-center gap-2"
                              >
                                <Sparkles className="w-4 h-4" />
                                <span>Unlock Knowledge Quiz</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {quizUnlocked && (
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                                Self-Assessment Unlocked
                              </span>
                              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                                Knowledge Check: {activeModule.title}
                              </h2>
                            </div>
                            <button
                              type="button"
                              onClick={() => setQuizUnlocked(false)}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                            >
                              Review Sections
                            </button>
                          </div>

                          {/* Interactive Clinical Mini-Case */}
                          {activeModule.miniCase && (
                            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-800">
                                <FileText className="w-4 h-4 text-indigo-600" />
                                <span>On-Call Clinical Mini-Case</span>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                                {activeModule.miniCase.scenario}
                              </p>
                              <p className="text-xs sm:text-sm font-bold text-indigo-950">
                                {activeModule.miniCase.question}
                              </p>
                              {miniCaseRevealed[activeModule.id] ? (
                                <div className="p-3.5 rounded-xl bg-white border border-indigo-200 text-xs sm:text-sm text-slate-800">
                                  <strong className="text-emerald-700">Model Answer:</strong>{' '}
                                  {activeModule.miniCase.answer}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMiniCaseRevealed((prev) => ({
                                      ...prev,
                                      [activeModule.id]: true
                                    }))
                                  }
                                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
                                >
                                  Reveal Clinical Answer
                                </button>
                              )}
                            </div>
                          )}

                          {/* Quiz Questions */}
                          {activeModule.quiz?.length > 0 && (
                            <div className="space-y-4">
                              {activeModule.quiz.map((q, qIdx) => {
                                const key = `${activeModule.id}-${qIdx}`;
                                const chosen = quizAnswers[key];
                                return (
                                  <div
                                    key={qIdx}
                                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                                  >
                                    <p className="text-sm font-bold text-slate-900">
                                      Q{qIdx + 1}. {q.question}
                                    </p>
                                    <div className="space-y-2">
                                      {q.options.map((opt, oIdx) => {
                                        const isChosen = chosen === oIdx;
                                        const isCorrect = q.correctIndex === oIdx;
                                        let style =
                                          'bg-white border-slate-200 text-slate-800 hover:border-emerald-400';
                                        if (chosen !== undefined) {
                                          if (isCorrect) {
                                            style =
                                              'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
                                          } else if (isChosen) {
                                            style = 'bg-rose-50 border-rose-300 text-rose-900';
                                          }
                                        }
                                        return (
                                          <button
                                            key={oIdx}
                                            type="button"
                                            onClick={() => {
                                              const nextAnswers = { ...quizAnswers, [key]: oIdx };
                                              setQuizAnswers(nextAnswers);
                                              const allAnswered = activeModule.quiz.every(
                                                (_, i) =>
                                                  nextAnswers[`${activeModule.id}-${i}`] !==
                                                  undefined
                                              );
                                              if (allAnswered) {
                                                setCompletedModules((prev) => ({
                                                  ...prev,
                                                  [activeModule.id]: true
                                                }));
                                              }
                                            }}
                                            className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition flex items-center justify-between gap-2 ${style}`}
                                          >
                                            <span>{opt}</span>
                                            {chosen !== undefined && isCorrect && (
                                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {chosen !== undefined && (
                                      <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                                        <strong>Rationale:</strong> {q.explanation}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
                        Learning Modules
                      </h1>
                      <p className="text-sm sm:text-base text-slate-500">
                        Filter modules by your clinical setting: pre-hospital emergencies, in-patient wards, or community care.
                      </p>
                    </div>
                  </div>

                  {/* Clinical Setting Filter Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    {MODULE_SETTING_FILTERS.map((flt) => {
                      const active = moduleSettingFilter === flt.id;
                      return (
                        <button
                          key={flt.id}
                          type="button"
                          onClick={() => setModuleSettingFilter(flt.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                            active
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {flt.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredLearningModules.map((mod) => {
                      const isDone = !!completedModules[mod.id];
                      const tagLabels = (mod.settingTags || []).map((t) =>
                        t === 'pre-hospital'
                          ? 'Pre-Hospital'
                          : t === 'in-patient'
                          ? 'In-Patient'
                          : 'Community Care'
                      );
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => {
                            setActiveModuleId(mod.id);
                            setActiveSectionIndex(0);
                            setQuizUnlocked(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="w-full text-left bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between gap-5 group"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                {mod.badge}
                              </span>
                              {isDone && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition">
                              {mod.title}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{mod.summary}</p>
                            {tagLabels.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {tagLabels.map((lbl) => (
                                  <span
                                    key={lbl}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold"
                                  >
                                    {lbl}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between w-full text-xs text-slate-500 font-medium">
                            <span>
                              {mod.duration} • {(mod.sections || []).length} sections
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

            {/* 2B. MANDATORY EDUCATIONAL DECLARATION GATE BEFORE PROCEDURE SIM */}
            {learningSectionTab === 'simulator' && !simDisclaimerAccepted && (
              <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                      Educational &amp; Clinical Safety Declaration
                    </h2>
                    <p className="text-xs text-slate-500">
                      Please read and confirm before entering Procedure Sim
                    </p>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200 list-disc pl-8">
                  <li>
                    <strong>Purely Educational:</strong> This interactive simulator is designed
                    solely for educational familiarisation and does <strong>not</strong> replace
                    formal hands-on practical training, mannequin simulation, or clinical competency
                    assessment.
                  </li>
                  <li>
                    <strong>Guidelines Evolve:</strong> Every effort is made to ensure anatomical
                    and procedural steps are as accurate as possible, however national and local
                    guidelines may change over time.
                  </li>
                  <li>
                    <strong>Real Emergencies:</strong> In a real clinical emergency, always check
                    and follow your current local NHS Trust, JRCALC, NTSP, or DAS protocols and
                    work within your professional scope of practice.
                  </li>
                </ul>

                <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={simDeclarationChecked}
                    onChange={(e) => setSimDeclarationChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800">
                    I understand and agree that this simulation is strictly educational and does not
                    replace formal training or current emergency clinical guidelines.
                  </span>
                </label>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!simDeclarationChecked}
                    onClick={() => setSimDisclaimerAccepted(true)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-bold transition"
                  >
                    Enter Procedure Sim
                  </button>
                </div>
              </div>
            )}

            {/* 2C. ZERO-LAG MULTI-LAYER PROCEDURE SIMULATOR */}
            {learningSectionTab === 'simulator' &&
              activeSim &&
              simDisclaimerAccepted &&
              (() => {
                const safeStepIndex = Math.min(
                  simStepIndex,
                  Math.max(0, visibleSimSteps.length - 1)
                );
                const currentSimStep = visibleSimSteps[safeStepIndex] || visibleSimSteps[0];
                if (!currentSimStep) return null;

                const completedCount = visibleSimSteps.filter(
                  (st) => !!simCompletedSteps[`${activeSim.id}-${st.id}`]
                ).length;
                const isStepDone =
                  !!simCompletedSteps[`${activeSim.id}-${currentSimStep.id}`];

                // Multi-Layer Anatomical Depth Stage (Idea 1)
                const isSkinPrepped = !!simCompletedSteps[`${activeSim.id}-cric-3`];
                const isMembraneMarked = !!simCompletedSteps[`${activeSim.id}-cric-2`];
                const isLumenOpen =
                  !!simCompletedSteps[`${activeSim.id}-cric-5`] ||
                  currentSimStep.id === 'cric-6' ||
                  currentSimStep.id === 'cric-7';
                const isNeedleStep = currentSimStep.id === 'cric-4';

                const progressRatio =
                  visibleSimSteps.length > 0 ? completedCount / visibleSimSteps.length : 0;
                const isAirwaySecured =
                  completedCount === visibleSimSteps.length && visibleSimSteps.length > 0;
                const monitorSpo2 = isAirwaySecured
                  ? 98
                  : Math.min(94, Math.round(76 + progressRatio * 18));
                const monitorHr = isAirwaySecured
                  ? simAgeGroup === 'infant'
                    ? 135
                    : simAgeGroup === 'child'
                    ? 112
                    : 88
                  : simAgeGroup === 'infant'
                  ? 62
                  : 58;
                const monitorEtco2 = isAirwaySecured
                  ? '4.9 kPa (Square-Wave)'
                  : completedCount >= Math.max(1, visibleSimSteps.length - 1)
                  ? '3.2 kPa (Rising)'
                  : '0.0 kPa (Flat / Hypoxic)';

                // Mid-Procedure "What If?" Complication Scenarios (Idea 3)
                const STEP_COMPLICATIONS = {
                  'cric-4': {
                    id: 'comp-cric-4',
                    title: 'Mid-Procedure Complication: No Air Aspiration',
                    scenario:
                      'You advance the 14G cannula into the cricothyroid membrane and feel firm posterior resistance, with NO air bubbles entering the saline syringe. What is your immediate action?',
                    options: [
                      'Push 1 cm deeper to try to reach the posterior lumen',
                      'Stop immediately, withdraw slowly while gently aspirating, and re-angle 45° caudally in the midline'
                    ],
                    correctIndex: 1,
                    rationale:
                      'Pushing through firm resistance risks perforating the posterior tracheal wall and oesophagus. Always withdraw slowly while aspirating and re-align 45° caudally in the midline.'
                  },
                  'cric-6': {
                    id: 'comp-cric-6',
                    title: 'Mid-Procedure Complication: Bougie Hold-Up',
                    scenario:
                      'As you advance the paediatric bougie downward into the incised trachea, you feel a smooth stop around 9 cm. What should you do next?',
                    options: [
                      'Force the bougie further until it passes freely',
                      'Do NOT force it — maintain position at 8–10 cm (tracheal/carinal hold-up) and gently railroad the lubricated cuffed tube over it'
                    ],
                    correctIndex: 1,
                    rationale:
                      'Forcing a bougie against resistance can cause bronchial/carinal perforation. Gentle hold-up at 8–10 cm confirms intratracheal placement ready for tube railroading.'
                  },
                  'tc-3': {
                    id: 'comp-tc-3',
                    title: 'Mid-Procedure Complication: Tight Stoma Resistance',
                    scenario:
                      'The lubricated same-size spare tracheostomy tube meets firm resistance halfway into the stoma. What is your immediate action?',
                    options: [
                      'Apply steady downward pressure until the neck flange sits flush',
                      'Stop and withdraw immediately — switch to the 0.5 mm smaller downsize spare tube to avoid creating a false passage'
                    ],
                    correctIndex: 1,
                    rationale:
                      'Never force a tracheostomy tube against resistance; doing so creates a pre-tracheal false passage. Always step down immediately to the 0.5 mm smaller tube.'
                  }
                };

                const triggerComplicationIfNeeded = () => {
                  if (!simComplicationsEnabled) return false;
                  const comp = STEP_COMPLICATIONS[currentSimStep.id];
                  if (!comp || complicationResolvedIds[comp.id]) return false;
                  setActiveSimComplication(comp);
                  setComplicationChoiceIdx(null);
                  return true;
                };

                const completeCurrentSimStep = () => {
                  simDragActiveRef.current = false;
                  simProgressRef.current = 100;
                  if (simLiveProgressTextRef.current) {
                    simLiveProgressTextRef.current.textContent = '100%';
                  }
                  setSimCompletedSteps((prev) => ({
                    ...prev,
                    [`${activeSim.id}-${currentSimStep.id}`]: true
                  }));
                  setSimShowMeHint(false);
                  setSimActionProgress(100);
                  setSimDragActive(false);
                  setSimFeedbackBanner({
                    type: 'success',
                    text: `✓ Step ${safeStepIndex + 1} completed! ${
                      safeStepIndex < visibleSimSteps.length - 1
                        ? 'Tap Next to continue.'
                        : 'All procedure steps completed — SpO2 & EtCO2 restored!'
                    }`
                  });
                };

                const getSvgPointFromClient = (clientX, clientY) => {
                  const svgEl = simSvgRef.current;
                  if (!svgEl) return { x: 0, y: 0, localX: 0, localY: 0 };
                  const rect = svgEl.getBoundingClientRect();
                  const localX = clientX - rect.left;
                  const localY = clientY - rect.top;
                  return {
                    x: (localX / (rect.width || 1)) * 500,
                    y: (localY / (rect.height || 1)) * 340,
                    localX,
                    localY
                  };
                };

                const moveCursorOverlay = (localX, localY, visible = true) => {
                  if (!simCursorOverlayRef.current) return;
                  simCursorOverlayRef.current.style.opacity = visible ? '1' : '0';
                  simCursorOverlayRef.current.style.transform = `translate3d(${localX}px, ${localY}px, 0)`;
                };

                const resetStepGestureBuffers = () => {
                  simDragActiveRef.current = false;
                  simStrokeRef.current = [];
                  simPaintedRef.current = {};
                  simProgressRef.current = 0;
                  if (simLivePolylineRef.current) {
                    simLivePolylineRef.current.setAttribute('points', '');
                  }
                  if (simLiveProgressTextRef.current) {
                    simLiveProgressTextRef.current.textContent = '0%';
                  }
                  if (simLiveAdvanceLineRef.current && currentSimStep?.dragStart) {
                    simLiveAdvanceLineRef.current.setAttribute(
                      'x2',
                      String(currentSimStep.dragStart.x)
                    );
                    simLiveAdvanceLineRef.current.setAttribute(
                      'y2',
                      String(currentSimStep.dragStart.y)
                    );
                    simLiveAdvanceLineRef.current.setAttribute('opacity', '0');
                  }
                  if (simSyringeGroupRef.current && currentSimStep?.dragStart) {
                    simSyringeGroupRef.current.setAttribute(
                      'transform',
                      `translate(${currentSimStep.dragStart.x}, ${currentSimStep.dragStart.y})`
                    );
                  }
                  if (simBubblesGroupRef.current) {
                    simBubblesGroupRef.current.setAttribute('opacity', '0');
                  }
                  if (simHoldCircleRef.current) {
                    simHoldCircleRef.current.setAttribute('opacity', '0');
                  }
                  setSimDragActive(false);
                  setSimStrokePoints([]);
                  setSimActionProgress(0);
                };

                const handleResetCurrentStepOnly = () => {
                  setSimCompletedSteps((prev) => {
                    const copy = { ...prev };
                    delete copy[`${activeSim.id}-${currentSimStep.id}`];
                    return copy;
                  });
                  setSimFeedbackBanner(null);
                  setSimShowMeHint(false);
                  resetStepGestureBuffers();
                };

                const getActionModeLabel = (type) => {
                  if (type === 'paint') return 'Scrub / Coat Area';
                  if (type === 'draw') return 'Trace / Incise Line';
                  if (type === 'advance') return 'Push / Advance Along Tract';
                  if (type === 'hold') return 'Press & Hold to Stabilise';
                  return 'Tap Target';
                };

                const getPointToSegmentMetrics = (pt, startPt, endPt) => {
                  const vx = endPt.x - startPt.x;
                  const vy = endPt.y - startPt.y;
                  const lenSq = vx * vx + vy * vy || 1;
                  const t = Math.max(
                    0,
                    Math.min(1, ((pt.x - startPt.x) * vx + (pt.y - startPt.y) * vy) / lenSq)
                  );
                  const projX = startPt.x + t * vx;
                  const projY = startPt.y + t * vy;
                  return {
                    t,
                    perpDist: Math.hypot(pt.x - projX, pt.y - projY),
                    distToEnd: Math.hypot(pt.x - endPt.x, pt.y - endPt.y)
                  };
                };

                const recordPaintCoverageAt = (pt) => {
                  const tz = currentSimStep.targetZone;
                  if (Math.hypot(pt.x - tz.x, pt.y - tz.y) > tz.r + 10) return;

                  const cellSize = 13;
                  const gx = Math.floor((pt.x - (tz.x - tz.r)) / cellSize);
                  const gy = Math.floor((pt.y - (tz.y - tz.r)) / cellSize);
                  const cellKey = `${gx},${gy}`;

                  if (simPaintedRef.current[cellKey]) return;
                  simPaintedRef.current[cellKey] = true;

                  const uniqueCellsCount = Object.keys(simPaintedRef.current).length;
                  const requiredCells = Math.max(
                    15,
                    Math.round(((Math.PI * tz.r * tz.r) / (cellSize * cellSize)) * 0.62)
                  );
                  const rawPct = Math.min(
                    100,
                    Math.round((uniqueCellsCount / requiredCells) * 100)
                  );
                  if (rawPct > simProgressRef.current) {
                    simProgressRef.current = rawPct;
                    if (simLiveProgressTextRef.current) {
                      simLiveProgressTextRef.current.textContent = `${rawPct}%`;
                    }
                    if (rawPct >= 100) {
                      setSimStrokePoints([...simStrokeRef.current]);
                      completeCurrentSimStep();
                    }
                  }
                };

                const handleInteractivePointerDown = (e) => {
                  if (activeSimComplication) return;
                  if (e.currentTarget.setPointerCapture) {
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {
                      // ignore
                    }
                  }
                  const pt = getSvgPointFromClient(e.clientX, e.clientY);
                  moveCursorOverlay(pt.localX, pt.localY, true);

                  if (isStepDone) return;

                  if (
                    currentSimStep.requiredTool &&
                    selectedSimTool !== currentSimStep.requiredTool
                  ) {
                    const reqToolObj = activeSim.tools.find(
                      (t) => t.id === currentSimStep.requiredTool
                    );
                    setSimMistakesCount((c) => c + 1);
                    setSimFeedbackBanner({
                      type: 'warn',
                      text: `Select "${reqToolObj?.short || 'the required tool'}" from the Instrument Tray first.`
                    });
                    return;
                  }

                  const mode = currentSimStep.interactionType || 'tap';

                  if (mode === 'tap') {
                    const dist = Math.hypot(
                      pt.x - currentSimStep.targetZone.x,
                      pt.y - currentSimStep.targetZone.y
                    );
                    if (dist <= currentSimStep.targetZone.r + 16) {
                      completeCurrentSimStep();
                    } else {
                      setSimMistakesCount((c) => c + 1);
                      setSimFeedbackBanner({
                        type: 'warn',
                        text: `Aim closer to ${currentSimStep.targetZone.label}.`
                      });
                    }
                    return;
                  }

                  if (mode === 'hold') {
                    const dist = Math.hypot(
                      pt.x - currentSimStep.targetZone.x,
                      pt.y - currentSimStep.targetZone.y
                    );
                    if (dist <= currentSimStep.targetZone.r + 16) {
                      simDragActiveRef.current = true;
                      simProgressRef.current = 8;
                      if (simLiveProgressTextRef.current) {
                        simLiveProgressTextRef.current.textContent = '8%';
                      }
                      setSimDragActive(true);
                      setSimFeedbackBanner(null);
                    } else {
                      setSimMistakesCount((c) => c + 1);
                      setSimFeedbackBanner({
                        type: 'warn',
                        text: `Press directly on ${currentSimStep.targetZone.label} and hold steady until 100%.`
                      });
                    }
                    return;
                  }

                  if (mode === 'paint') {
                    const tz = currentSimStep.targetZone;
                    if (Math.hypot(pt.x - tz.x, pt.y - tz.y) > tz.r + 14) {
                      setSimMistakesCount((c) => c + 1);
                      setSimFeedbackBanner({
                        type: 'warn',
                        text: `Press and scrub back-and-forth inside ${tz.label} to coat the surgical field.`
                      });
                      return;
                    }
                    simDragActiveRef.current = true;
                    setSimFeedbackBanner(null);
                    simStrokeRef.current.push({ x: pt.x, y: pt.y });
                    if (simLivePolylineRef.current) {
                      simLivePolylineRef.current.setAttribute(
                        'points',
                        simStrokeRef.current
                          .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                          .join(' ')
                      );
                    }
                    recordPaintCoverageAt(pt);
                    return;
                  }

                  if (mode === 'draw' || mode === 'drag') {
                    if (currentSimStep.dragStart) {
                      const distFromStart = Math.hypot(
                        pt.x - currentSimStep.dragStart.x,
                        pt.y - currentSimStep.dragStart.y
                      );
                      if (distFromStart > 28) {
                        setSimMistakesCount((c) => c + 1);
                        setSimFeedbackBanner({
                          type: 'warn',
                          text: 'Start on the orange start dot and trace smoothly along the guide line to the green end dot.'
                        });
                        return;
                      }
                    }
                    simDragActiveRef.current = true;
                    simProgressRef.current = 0;
                    if (simLiveProgressTextRef.current) {
                      simLiveProgressTextRef.current.textContent = '0%';
                    }
                    setSimFeedbackBanner(null);
                    simStrokeRef.current = [{ x: pt.x, y: pt.y }];
                    if (simLivePolylineRef.current) {
                      simLivePolylineRef.current.setAttribute(
                        'points',
                        `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
                      );
                    }
                    return;
                  }

                  if (mode === 'advance') {
                    const startPt = currentSimStep.dragStart || currentSimStep.targetZone;
                    if (Math.hypot(pt.x - startPt.x, pt.y - startPt.y) <= 30) {
                      simDragActiveRef.current = true;
                      simProgressRef.current = 0;
                      if (simLiveProgressTextRef.current) {
                        simLiveProgressTextRef.current.textContent = '0%';
                      }
                      setSimFeedbackBanner(null);
                      simStrokeRef.current = [{ x: pt.x, y: pt.y }];
                    } else {
                      setSimMistakesCount((c) => c + 1);
                      setSimFeedbackBanner({
                        type: 'warn',
                        text: `Start at the orange entry dot (${currentSimStep.targetZone.label}) and push smoothly to the green depth marker.`
                      });
                    }
                  }
                };

                const handleInteractivePointerMove = (e) => {
                  const pt = getSvgPointFromClient(e.clientX, e.clientY);
                  moveCursorOverlay(pt.localX, pt.localY, true);

                  if (!simDragActiveRef.current || isStepDone || activeSimComplication) return;

                  const mode = currentSimStep.interactionType || 'tap';

                  if (mode === 'hold') {
                    const tz = currentSimStep.targetZone;
                    if (Math.hypot(pt.x - tz.x, pt.y - tz.y) > tz.r + 22) {
                      simDragActiveRef.current = false;
                      simProgressRef.current = 0;
                      if (simLiveProgressTextRef.current) {
                        simLiveProgressTextRef.current.textContent = '0%';
                      }
                      if (simHoldCircleRef.current) {
                        simHoldCircleRef.current.setAttribute('opacity', '0');
                      }
                      setSimDragActive(false);
                      setSimFeedbackBanner({
                        type: 'warn',
                        text: `Slipped off ${tz.label} — press and hold steady until 100%.`
                      });
                    }
                    return;
                  }

                  if (simStrokeRef.current.length > 260) {
                    simStrokeRef.current.shift();
                  }
                  simStrokeRef.current.push({ x: pt.x, y: pt.y });

                  if (
                    simLivePolylineRef.current &&
                    (mode === 'paint' || mode === 'draw' || mode === 'drag')
                  ) {
                    simLivePolylineRef.current.setAttribute(
                      'points',
                      simStrokeRef.current
                        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                        .join(' ')
                    );
                  }

                  if (mode === 'paint') {
                    recordPaintCoverageAt(pt);
                    return;
                  }

                  if (mode === 'draw' || mode === 'drag') {
                    if (currentSimStep.dragStart && currentSimStep.dragEnd) {
                      const { t, perpDist, distToEnd } = getPointToSegmentMetrics(
                        pt,
                        currentSimStep.dragStart,
                        currentSimStep.dragEnd
                      );
                      if (perpDist > 32) return;

                      const rawPct = Math.round(t * 100);
                      const nextPct = Math.min(
                        100,
                        Math.max(simProgressRef.current, Math.min(rawPct, simProgressRef.current + 14))
                      );
                      if (nextPct > simProgressRef.current) {
                        simProgressRef.current = nextPct;
                        if (simLiveProgressTextRef.current) {
                          simLiveProgressTextRef.current.textContent = `${nextPct}%`;
                        }
                        if (nextPct >= 92 && distToEnd <= 26) {
                          setSimStrokePoints([...simStrokeRef.current]);
                          completeCurrentSimStep();
                        }
                      }
                    }
                    return;
                  }

                  if (mode === 'advance') {
                    const startPt = currentSimStep.dragStart || currentSimStep.targetZone;
                    const endPt = currentSimStep.dragEnd || { x: startPt.x, y: startPt.y + 65 };
                    const { t, perpDist, distToEnd } = getPointToSegmentMetrics(pt, startPt, endPt);
                    if (perpDist > 36) return;

                    const rawPct = Math.round(t * 100);
                    const nextPct = Math.min(
                      100,
                      Math.max(simProgressRef.current, Math.min(rawPct, simProgressRef.current + 14))
                    );
                    if (nextPct > simProgressRef.current) {
                      simProgressRef.current = nextPct;
                      if (simLiveProgressTextRef.current) {
                        simLiveProgressTextRef.current.textContent = `${nextPct}%`;
                      }
                      const curX = startPt.x + ((endPt.x - startPt.x) * nextPct) / 100;
                      const curY = startPt.y + ((endPt.y - startPt.y) * nextPct) / 100;

                      if (simLiveAdvanceLineRef.current) {
                        simLiveAdvanceLineRef.current.setAttribute('x2', curX.toFixed(1));
                        simLiveAdvanceLineRef.current.setAttribute('y2', curY.toFixed(1));
                        simLiveAdvanceLineRef.current.setAttribute('opacity', '1');
                      }

                      if (isNeedleStep && simSyringeGroupRef.current) {
                        simSyringeGroupRef.current.setAttribute(
                          'transform',
                          `translate(${curX.toFixed(1)}, ${curY.toFixed(1)})`
                        );
                      }
                      if (isNeedleStep && simBubblesGroupRef.current) {
                        simBubblesGroupRef.current.setAttribute(
                          'opacity',
                          nextPct >= 55 ? '1' : '0'
                        );
                      }

                      if (nextPct >= 45 && nextPct < 75 && triggerComplicationIfNeeded()) {
                        simDragActiveRef.current = false;
                        return;
                      }

                      if (nextPct >= 92 && distToEnd <= 26) {
                        completeCurrentSimStep();
                      }
                    }
                  }
                };

                const handleInteractivePointerUp = (e) => {
                  if (e?.currentTarget?.releasePointerCapture && e?.pointerId !== undefined) {
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    } catch {
                      // ignore
                    }
                  }
                  if (simDragActiveRef.current) {
                    const mode = currentSimStep.interactionType || 'tap';
                    simDragActiveRef.current = false;
                    setSimDragActive(false);

                    if (mode === 'hold' && !isStepDone && simProgressRef.current < 100) {
                      simProgressRef.current = 0;
                      if (simLiveProgressTextRef.current) {
                        simLiveProgressTextRef.current.textContent = '0%';
                      }
                      if (simHoldCircleRef.current) {
                        simHoldCircleRef.current.setAttribute('opacity', '0');
                      }
                      setSimActionProgress(0);
                      setSimFeedbackBanner({
                        type: 'info',
                        text: `Keep holding steady on ${currentSimStep.targetZone.label} until 100%.`
                      });
                      return;
                    }

                    setSimActionProgress(simProgressRef.current);
                    setSimStrokePoints([...simStrokeRef.current]);
                  }
                };

                const handleAutoDemonstrate = () => {
                  setSelectedSimTool(currentSimStep.requiredTool);
                  setSimShowMeHint(true);
                  setSimFeedbackBanner({
                    type: 'info',
                    text: `Demo: ${currentSimStep.demoHint}`
                  });
                };

                const handleRestartSim = () => {
                  setSimStepIndex(0);
                  setSimCompletedSteps({});
                  setSimMistakesCount(0);
                  setSimElapsedSec(0);
                  setActiveSimComplication(null);
                  setComplicationResolvedIds({});
                  setComplicationChoiceIdx(null);
                  setSelectedSimTool(visibleSimSteps[0]?.requiredTool || 'tool-hands');
                  setSimFeedbackBanner(null);
                  setSimShowMeHint(false);
                  resetStepGestureBuffers();
                };

                const phases = [];
                visibleSimSteps.forEach((st, idx) => {
                  let group = phases.find((p) => p.name === st.phase);
                  if (!group) {
                    group = { name: st.phase, items: [] };
                    phases.push(group);
                  }
                  group.items.push({ ...st, globalIdx: idx });
                });

                const activeToolObj =
                  activeSim.tools.find((t) => t.id === selectedSimTool) || activeSim.tools[0];

                return (
                  <div className="space-y-6">
                    {/* Simulation Selector Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {procedureSims.map((sim) => {
                        const isSelected = activeSim.id === sim.id;
                        return (
                          <button
                            key={sim.id}
                            type="button"
                            onClick={() => {
                              setActiveSimId(sim.id);
                              setSimStepIndex(0);
                              setSelectedSimTool(sim.steps[0]?.requiredTool || 'tool-hands');
                              setSimFeedbackBanner(null);
                              setSimShowMeHint(false);
                              setActiveSimComplication(null);
                              resetStepGestureBuffers();
                            }}
                            className={`p-4 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="min-w-0">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  isSelected
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-indigo-50 text-indigo-700'
                                }`}
                              >
                                {sim.badge}
                              </span>
                              <div className="text-sm sm:text-base font-bold mt-1.5 truncate">
                                {sim.title}
                              </div>
                              <div
                                className={`text-xs truncate mt-0.5 ${
                                  isSelected ? 'text-slate-300' : 'text-slate-500'
                                }`}
                              >
                                {sim.subtitle}
                              </div>
                            </div>
                            <ChevronRight
                              className={`w-4 h-4 shrink-0 ${
                                isSelected ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    {/* Header + Controls */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
                      <div className="space-y-1">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                          {activeSim.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500">
                          {simViewMode === 'overview'
                            ? `Complete ${visibleSimSteps.length}-step anatomical & surgical walkthrough`
                            : `${completedCount} of ${visibleSimSteps.length} steps completed`}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {activeSim.supportsAgeSwitch !== false && (
                          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            {[
                              { id: 'infant', label: 'Infant (<1 yr)' },
                              { id: 'child', label: 'Child (2–6 yrs)' },
                              { id: 'adolescent', label: 'Adolescent (>10 yrs)' }
                            ].map((ag) => (
                              <button
                                key={ag.id}
                                type="button"
                                onClick={() => handleSimAgeGroupChange(ag.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                  simAgeGroup === ag.id
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {ag.label}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setSimViewMode('interactive')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                              simViewMode === 'interactive'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Interactive Practice
                          </button>
                          <button
                            type="button"
                            onClick={() => setSimViewMode('overview')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                              simViewMode === 'overview'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Full Overview</span>
                          </button>
                        </div>

                        {simViewMode === 'interactive' && (
                          <>
                            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => setSimPracticeStyle('guided')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                  simPracticeStyle === 'guided'
                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Guided
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSimPracticeStyle('exam');
                                  setSimShowMeHint(false);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                  simPracticeStyle === 'exam'
                                    ? 'bg-amber-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Test Mode
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSimComplicationsEnabled((p) => !p)}
                              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition inline-flex items-center gap-1 ${
                                simComplicationsEnabled
                                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                                  : 'bg-white border-slate-200 text-slate-500'
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>Complications: {simComplicationsEnabled ? 'On' : 'Off'}</span>
                            </button>
                          </>
                        )}

                        {activeSim.diagramType !== 'custom-image' && (
                          <button
                            type="button"
                            onClick={() => setShowSimLabels((p) => !p)}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition ${
                              showSimLabels
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            Labels: {showSimLabels ? 'On' : 'Off'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Age-Specific Clinical Guidance Banner */}
                    {activeSim.supportsAgeSwitch !== false && (
                      <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200 text-xs text-sky-950 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                        <div>
                          {simAgeGroup === 'infant' && (
                            <span>
                              <strong>Infant (&lt;1 yr) Pathway Active ({visibleSimSteps.length} steps):</strong>{' '}
                              Tailored to <strong>45° caudal needle cricothyroidotomy</strong> with
                              saline aspiration &amp; low-pressure oxygenation.
                            </span>
                          )}
                          {simAgeGroup === 'child' && (
                            <span>
                              <strong>Child (2–6 yrs) Pathway Active ({visibleSimSteps.length} steps):</strong>{' '}
                              DAS Paediatric CICO guidelines favour{' '}
                              <strong>45° caudal needle cricothyroidotomy</strong> in children under
                              8–10 years.
                            </span>
                          )}
                          {simAgeGroup === 'adolescent' && (
                            <span>
                              <strong>Adolescent (&gt;10 yrs) Pathway Active ({visibleSimSteps.length} steps):</strong>{' '}
                              Switches automatically to{' '}
                              <strong>Surgical Scalpel–Bougie–Tube</strong> rescue with open-lumen
                              depth view.
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {simViewMode === 'overview' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {visibleSimSteps.map((st, idx) => {
                          const reqTool = activeSim.tools.find((t) => t.id === st.requiredTool);
                          return (
                            <div
                              key={st.id}
                              className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-4"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">
                                    Step {idx + 1} • {st.phase}
                                  </span>
                                  {reqTool && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                                      {renderSimToolGlyph(reqTool.id, 'w-3 h-3 text-indigo-600')}
                                      <span>{reqTool.short}</span>
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-base font-bold text-slate-900">{st.title}</h3>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                  {st.instruction}
                                </p>
                                {st.traineeTip && (
                                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950">
                                    <strong>ENT / Surgical Pearl:</strong> {st.traineeTip}
                                  </div>
                                )}
                              </div>

                              <div className="pt-3 border-t border-slate-100 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSimStepIndex(idx);
                                    setSelectedSimTool(st.requiredTool);
                                    setSimViewMode('interactive');
                                    resetStepGestureBuffers();
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900"
                                >
                                  <span>Practise This Step</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left Sidebar: Procedure Steps */}
                        <div className="lg:col-span-4 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              Procedure Steps
                            </span>
                            <button
                              type="button"
                              onClick={handleRestartSim}
                              className="text-xs font-semibold text-slate-500 hover:text-rose-600 inline-flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restart</span>
                            </button>
                          </div>

                          <div className="space-y-4">
                            {phases.map((phase) => (
                              <div key={phase.name} className="space-y-1.5">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 px-1">
                                  {phase.name}
                                </div>
                                <div className="space-y-1">
                                  {phase.items.map((st) => {
                                    const active = st.globalIdx === safeStepIndex;
                                    const done = !!simCompletedSteps[`${activeSim.id}-${st.id}`];
                                    return (
                                      <button
                                        key={st.id}
                                        type="button"
                                        onClick={() => {
                                          setSimStepIndex(st.globalIdx);
                                          setSelectedSimTool(st.requiredTool);
                                          setSimFeedbackBanner(null);
                                          setSimShowMeHint(false);
                                          setActiveSimComplication(null);
                                          resetStepGestureBuffers();
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition flex items-center justify-between gap-2 ${
                                          active
                                            ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                                            : done
                                            ? 'bg-emerald-50/80 text-emerald-900 font-medium'
                                            : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                      >
                                        <span className="truncate">
                                          {st.globalIdx + 1}. {st.title}
                                        </span>
                                        {done && (
                                          <CheckCircle2
                                            className={`w-3.5 h-3.5 shrink-0 ${
                                              active ? 'text-emerald-400' : 'text-emerald-600'
                                            }`}
                                          />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Right Workspace */}
                        <div className="lg:col-span-8 space-y-4">
                          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
                            {/* Live Physiological Telemetry Monitor Strip */}
                            <div className="rounded-2xl bg-slate-950 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border border-slate-800">
                              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                <HeartPulse
                                  className={`w-4 h-4 ${
                                    isAirwaySecured
                                      ? 'text-emerald-400'
                                      : 'text-rose-500 animate-pulse'
                                  }`}
                                />
                                <span>Live Patient Telemetry</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                                <div>
                                  <span className="text-slate-400 mr-1">SpO2:</span>
                                  <span
                                    className={`font-bold ${
                                      monitorSpo2 >= 94 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {monitorSpo2}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 mr-1">HR:</span>
                                  <span
                                    className={`font-bold ${
                                      monitorHr >= 80 ? 'text-emerald-400' : 'text-amber-400'
                                    }`}
                                  >
                                    {monitorHr} bpm
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 mr-1">EtCO2:</span>
                                  <span
                                    className={`font-bold ${
                                      isAirwaySecured ? 'text-sky-400' : 'text-amber-400'
                                    }`}
                                  >
                                    {monitorEtco2}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="text-xs font-bold text-indigo-700">
                                  Step {safeStepIndex + 1} of {visibleSimSteps.length} •{' '}
                                  {currentSimStep.phase}
                                </span>
                                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                                  {currentSimStep.title}
                                </h3>
                              </div>
                              {activeSim.diagramType === 'builtin-neck' && (
                                <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-600">
                                  Depth Layer:{' '}
                                  <strong className="text-slate-900">
                                    {isLumenOpen
                                      ? 'Open Tracheal Lumen'
                                      : isSkinPrepped
                                      ? 'Prepped Surgical Field'
                                      : 'Surface Anatomy'}
                                  </strong>
                                </span>
                              )}
                            </div>

                            {/* Step Instruction & ENT Pearl Box (Above Interactive Picture) */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
                              <p className="text-xs sm:text-sm font-semibold text-slate-900">
                                {currentSimStep.instruction}
                              </p>
                              {currentSimStep.traineeTip && (
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  <strong className="text-indigo-700">
                                    ENT / Surgical Pearl:
                                  </strong>{' '}
                                  {currentSimStep.traineeTip}
                                </p>
                              )}
                            </div>

                            {/* Mid-Procedure Complication Popup (Idea 3) */}
                            {activeSimComplication && (
                              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/90 border-2 border-rose-300 shadow-sm space-y-3">
                                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-rose-800">
                                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                  <span>{activeSimComplication.title}</span>
                                </div>
                                <p className="text-xs sm:text-sm font-semibold text-rose-950 leading-relaxed">
                                  {activeSimComplication.scenario}
                                </p>
                                <div className="space-y-2">
                                  {activeSimComplication.options.map((opt, idx) => {
                                    const isPicked = complicationChoiceIdx === idx;
                                    const isCorrect = activeSimComplication.correctIndex === idx;
                                    let cls =
                                      'bg-white border-rose-200 text-slate-800 hover:border-rose-400';
                                    if (complicationChoiceIdx !== null) {
                                      if (isCorrect) {
                                        cls =
                                          'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
                                      } else if (isPicked && !isCorrect) {
                                        cls = 'bg-rose-100 border-rose-400 text-rose-900';
                                      }
                                    }
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                          setComplicationChoiceIdx(idx);
                                          if (!isCorrect) setSimMistakesCount((c) => c + 1);
                                        }}
                                        className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition flex items-center justify-between gap-2 ${cls}`}
                                      >
                                        <span>{opt}</span>
                                        {complicationChoiceIdx !== null && isCorrect && (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                {complicationChoiceIdx !== null && (
                                  <div className="p-3 rounded-xl bg-white border border-rose-200 text-xs text-slate-700 space-y-2">
                                    <p>
                                      <strong>Clinical Rationale:</strong>{' '}
                                      {activeSimComplication.rationale}
                                    </p>
                                    <div className="flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setComplicationResolvedIds((prev) => ({
                                            ...prev,
                                            [activeSimComplication.id]: true
                                          }));
                                          setActiveSimComplication(null);
                                          setComplicationChoiceIdx(null);
                                        }}
                                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                                      >
                                        Resume Procedure
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {simFeedbackBanner && (
                              <div
                                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
                                  simFeedbackBanner.type === 'success'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    : simFeedbackBanner.type === 'warn'
                                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                                    : 'bg-sky-50 border-sky-200 text-sky-950'
                                }`}
                              >
                                <span>{simFeedbackBanner.text}</span>
                                <button
                                  type="button"
                                  onClick={() => setSimFeedbackBanner(null)}
                                  className="text-slate-400 hover:text-slate-700"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Side-by-Side Workspace: Canvas (Left) + Instrument Tray (Right) */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                              <div className="md:col-span-7 space-y-3">
                                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 shadow-lg select-none touch-none">
                                  <svg
                                    ref={simSvgRef}
                                    viewBox="0 0 500 340"
                                    preserveAspectRatio="none"
                                    className="w-full h-auto max-h-[390px] cursor-none block"
                                    onPointerMove={handleInteractivePointerMove}
                                    onPointerLeave={() => {
                                      moveCursorOverlay(0, 0, false);
                                      if (simDragActiveRef.current) {
                                        simDragActiveRef.current = false;
                                        setSimDragActive(false);
                                        setSimActionProgress(simProgressRef.current);
                                      }
                                    }}
                                    onPointerDown={handleInteractivePointerDown}
                                    onPointerUp={handleInteractivePointerUp}
                                    onPointerCancel={handleInteractivePointerUp}
                                  >
                                    <defs>
                                      <radialGradient id="simBgGlow" cx="50%" cy="45%" r="60%">
                                        <stop offset="0%" stopColor="#1e293b" />
                                        <stop offset="100%" stopColor="#090d16" />
                                      </radialGradient>
                                      <linearGradient id="neckSkinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#e5af93" />
                                        <stop offset="50%" stopColor="#fad7c3" />
                                        <stop offset="100%" stopColor="#e0a689" />
                                      </linearGradient>
                                      <radialGradient id="chlorhexWashGrad" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="rgba(249, 115, 22, 0.42)" />
                                        <stop offset="70%" stopColor="rgba(244, 63, 94, 0.25)" />
                                        <stop offset="100%" stopColor="rgba(244, 63, 94, 0)" />
                                      </radialGradient>
                                      <linearGradient id="cartilageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#f1f5f9" />
                                        <stop offset="100%" stopColor="#cbd5e1" />
                                      </linearGradient>
                                      <linearGradient id="ctmMembraneGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#fb7185" />
                                        <stop offset="50%" stopColor="#fda4af" />
                                        <stop offset="100%" stopColor="#fb7185" />
                                      </linearGradient>
                                    </defs>

                                    <rect x="0" y="0" width="500" height="340" fill="url(#simBgGlow)" />

                                    {activeSim.diagramType === 'custom-image' &&
                                    activeSim.customDiagramUrl ? (
                                      <image
                                        href={activeSim.customDiagramUrl}
                                        x="0"
                                        y="0"
                                        width="500"
                                        height="340"
                                        preserveAspectRatio="xMidYMid meet"
                                      />
                                    ) : activeSim.diagramType === 'builtin-sagittal' ? (
                                      <>
                                        <path
                                          d="M 155 25 L 185 135 L 185 195 L 155 315 L 220 315 L 220 25 Z"
                                          fill="url(#neckSkinGrad)"
                                          stroke="#c98e71"
                                          strokeWidth="2"
                                        />
                                        <path
                                          d="M 205 182 L 216 285"
                                          stroke="#f43f5e"
                                          strokeWidth="6"
                                          strokeDasharray="4 4"
                                          opacity="0.8"
                                        />
                                        <rect
                                          x="232"
                                          y="25"
                                          width="66"
                                          height="290"
                                          rx="14"
                                          fill="#172033"
                                          stroke="#38bdf8"
                                          strokeWidth="2.5"
                                        />
                                        <rect x="180" y="150" width="60" height="28" fill="#172033" />
                                        <rect
                                          x="306"
                                          y="25"
                                          width="34"
                                          height="290"
                                          rx="8"
                                          fill="#334155"
                                          opacity="0.75"
                                        />
                                        {[55, 85, 115, 200, 230, 260, 290].map((ry, i) => (
                                          <rect
                                            key={i}
                                            x="225"
                                            y={ry}
                                            width="12"
                                            height="16"
                                            rx="4"
                                            fill="url(#cartilageGrad)"
                                          />
                                        ))}
                                        {simCompletedSteps[`${activeSim.id}-tc-3`] && (
                                          <path
                                            d="M 165 164 L 225 164 Q 265 164 265 215 L 265 268"
                                            fill="none"
                                            stroke="#38bdf8"
                                            strokeWidth="16"
                                            strokeLinecap="round"
                                          />
                                        )}
                                        {simCompletedSteps[`${activeSim.id}-tc-4`] && (
                                          <rect
                                            x="148"
                                            y="152"
                                            width="22"
                                            height="24"
                                            rx="4"
                                            fill="#10b981"
                                          />
                                        )}
                                        {showSimLabels && (
                                          <g fontSize="11" fontWeight="700" fontFamily="sans-serif">
                                            <text x="48" y="168" fill="#f8fafc">
                                              Anterior Neck Stoma
                                            </text>
                                            <text x="34" y="255" fill="#fda4af">
                                              Pre-Tracheal Plane (False Passage)
                                            </text>
                                            <text x="352" y="110" fill="#7dd3fc">
                                              True Tracheal Lumen
                                            </text>
                                            <text x="352" y="210" fill="#cbd5e1">
                                              Posterior Wall / Oesophagus
                                            </text>
                                          </g>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        {/* Anterior Neck Surface Layer */}
                                        <path
                                          d="M 140 20 Q 250 75 360 20 L 385 320 L 115 320 Z"
                                          fill="url(#neckSkinGrad)"
                                          stroke="#c98e71"
                                          strokeWidth="2.5"
                                        />
                                        <path
                                          d="M 155 28 Q 250 82 345 28 Q 250 62 155 28 Z"
                                          fill="#d49b7e"
                                          opacity="0.7"
                                        />
                                        <path
                                          d="M 145 75 L 205 315"
                                          stroke="#c88d70"
                                          strokeWidth="13"
                                          strokeLinecap="round"
                                          opacity="0.4"
                                        />
                                        <path
                                          d="M 355 75 L 295 315"
                                          stroke="#c88d70"
                                          strokeWidth="13"
                                          strokeLinecap="round"
                                          opacity="0.4"
                                        />

                                        {/* Layer 2: Persistent Chlorhexidine Wash */}
                                        {isSkinPrepped && (
                                          <circle
                                            cx="250"
                                            cy="182"
                                            r="68"
                                            fill="url(#chlorhexWashGrad)"
                                          />
                                        )}

                                        <path
                                          d="M 210 102 Q 250 116 290 102"
                                          fill="none"
                                          stroke="#94a3b8"
                                          strokeWidth="7"
                                          strokeLinecap="round"
                                          opacity="0.9"
                                        />
                                        <path
                                          d="M 212 126 L 250 134 L 288 126 L 280 168 L 250 173 L 220 168 Z"
                                          fill="url(#cartilageGrad)"
                                          stroke="#64748b"
                                          strokeWidth="2"
                                        />
                                        <rect
                                          x="227"
                                          y="173"
                                          width="46"
                                          height="18"
                                          rx="6"
                                          fill="url(#ctmMembraneGrad)"
                                          stroke="#e11d48"
                                          strokeWidth="2"
                                        />
                                        <rect
                                          x="218"
                                          y="192"
                                          width="64"
                                          height="16"
                                          rx="7"
                                          fill="url(#cartilageGrad)"
                                          stroke="#475569"
                                          strokeWidth="2"
                                        />
                                        {[214, 232, 250, 268].map((ry, i) => (
                                          <rect
                                            key={i}
                                            x="224"
                                            y={ry}
                                            width="52"
                                            height="12"
                                            rx="5"
                                            fill="url(#cartilageGrad)"
                                            stroke="#64748b"
                                            strokeWidth="1.5"
                                            opacity="0.92"
                                          />
                                        ))}

                                        {/* Layer 3 (Idea 1): Open Tracheal Lumen Window */}
                                        {isLumenOpen && (
                                          <g>
                                            <rect
                                              x="228"
                                              y="174"
                                              width="44"
                                              height="112"
                                              rx="10"
                                              fill="#0b1220"
                                              stroke="#f43f5e"
                                              strokeWidth="2"
                                            />
                                            {[196, 214, 232, 250, 268].map((ry, idx) => (
                                              <path
                                                key={idx}
                                                d={`M 232 ${ry} Q 250 ${ry + 6} 268 ${ry}`}
                                                fill="none"
                                                stroke="rgba(148, 163, 184, 0.55)"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                              />
                                            ))}
                                            <ellipse
                                              cx="250"
                                              cy="182"
                                              rx="18"
                                              ry="6"
                                              fill="#4c0519"
                                              stroke="#fb7185"
                                              strokeWidth="1.8"
                                            />
                                          </g>
                                        )}

                                        <path
                                          d="M 195 318 Q 250 292 305 318"
                                          fill="none"
                                          stroke="#b87a5e"
                                          strokeWidth="4"
                                          strokeLinecap="round"
                                        />

                                        {isMembraneMarked && (
                                          <line
                                            x1="250"
                                            y1="142"
                                            x2="250"
                                            y2="215"
                                            stroke="#2563eb"
                                            strokeWidth="3.5"
                                            strokeDasharray="5 4"
                                          />
                                        )}
                                        {simCompletedSteps[`${activeSim.id}-cric-4`] && (
                                          <g>
                                            <line
                                              x1="250"
                                              y1="182"
                                              x2="250"
                                              y2="238"
                                              stroke="#0284c7"
                                              strokeWidth="4.5"
                                              strokeLinecap="round"
                                            />
                                            <rect
                                              x="240"
                                              y="168"
                                              width="20"
                                              height="14"
                                              rx="3"
                                              fill="#38bdf8"
                                            />
                                          </g>
                                        )}
                                        {simCompletedSteps[`${activeSim.id}-cric-6`] && (
                                          <path
                                            d="M 250 182 L 250 272"
                                            stroke="#38bdf8"
                                            strokeWidth="5.5"
                                            strokeLinecap="round"
                                          />
                                        )}
                                        {simCompletedSteps[`${activeSim.id}-cric-7`] && (
                                          <g>
                                            <rect
                                              x="232"
                                              y="168"
                                              width="36"
                                              height="16"
                                              rx="4"
                                              fill="#ffffff"
                                              stroke="#059669"
                                              strokeWidth="2.5"
                                            />
                                            <circle cx="250" cy="176" r="5" fill="#10b981" />
                                          </g>
                                        )}

                                        {showSimLabels && (
                                          <g fontSize="11" fontWeight="700" fontFamily="sans-serif">
                                            <line x1="290" y1="102" x2="365" y2="95" stroke="#94a3b8" strokeWidth="1.2" />
                                            <text x="370" y="99" fill="#f1f5f9">Hyoid Bone</text>

                                            <line x1="288" y1="146" x2="365" y2="140" stroke="#94a3b8" strokeWidth="1.2" />
                                            <text x="370" y="144" fill="#f1f5f9">Thyroid Cartilage</text>

                                            <line x1="273" y1="182" x2="365" y2="182" stroke="#fb7185" strokeWidth="1.5" />
                                            <text x="370" y="186" fill="#fda4af">
                                              {isLumenOpen ? 'Incised CTM Window' : 'Cricothyroid Membrane'}
                                            </text>

                                            <line x1="282" y1="200" x2="365" y2="220" stroke="#94a3b8" strokeWidth="1.2" />
                                            <text x="370" y="224" fill="#f1f5f9">Cricoid Cartilage</text>

                                            <line x1="276" y1="250" x2="365" y2="262" stroke="#94a3b8" strokeWidth="1.2" />
                                            <text x="370" y="266" fill="#cbd5e1">
                                              {isLumenOpen ? 'Open Tracheal Lumen' : 'Tracheal Rings'}
                                            </text>

                                            <text x="250" y="330" textAnchor="middle" fill="#94a3b8" fontSize="10">
                                              Suprasternal Notch
                                            </text>
                                          </g>
                                        )}
                                      </>
                                    )}

                                    {/* Zero-Lag Direct DOM Polyline for Antiseptic Paint & Draw Strokes */}
                                    <polyline
                                      ref={simLivePolylineRef}
                                      points={simStrokePoints.map((p) => `${p.x},${p.y}`).join(' ')}
                                      fill="none"
                                      stroke={
                                        currentSimStep.interactionType === 'paint'
                                          ? 'rgba(249, 115, 22, 0.48)'
                                          : selectedSimTool.includes('scalpel')
                                          ? '#e11d48'
                                          : '#2563eb'
                                      }
                                      strokeWidth={
                                        currentSimStep.interactionType === 'paint' ? '28' : '4.5'
                                      }
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      pointerEvents="none"
                                    />

                                    {/* Live Advancing Tube / Bougie / Cannula Graphic */}
                                    {currentSimStep.interactionType === 'advance' &&
                                      currentSimStep.dragStart &&
                                      currentSimStep.dragEnd && (
                                        <g pointerEvents="none">
                                          <line
                                            x1={currentSimStep.dragStart.x}
                                            y1={currentSimStep.dragStart.y}
                                            x2={currentSimStep.dragEnd.x}
                                            y2={currentSimStep.dragEnd.y}
                                            stroke="rgba(56, 189, 248, 0.25)"
                                            strokeWidth="12"
                                            strokeLinecap="round"
                                          />
                                          <line
                                            ref={simLiveAdvanceLineRef}
                                            x1={currentSimStep.dragStart.x}
                                            y1={currentSimStep.dragStart.y}
                                            x2={currentSimStep.dragStart.x}
                                            y2={currentSimStep.dragStart.y}
                                            stroke="#38bdf8"
                                            strokeWidth="7"
                                            strokeLinecap="round"
                                            opacity="0"
                                          />
                                        </g>
                                      )}

                                    {/* Idea 2: Saline Syringe Aspiration Bubbles on Needle CTM */}
                                    {isNeedleStep && currentSimStep.dragStart && (
                                      <g
                                        ref={simSyringeGroupRef}
                                        transform={`translate(${currentSimStep.dragStart.x}, ${currentSimStep.dragStart.y})`}
                                        pointerEvents="none"
                                      >
                                        <g transform="translate(18, -58) rotate(24)">
                                          <rect
                                            x="0"
                                            y="0"
                                            width="22"
                                            height="48"
                                            rx="4"
                                            fill="rgba(186, 230, 253, 0.3)"
                                            stroke="#7dd3fc"
                                            strokeWidth="1.6"
                                          />
                                          <rect
                                            x="2"
                                            y="18"
                                            width="18"
                                            height="28"
                                            rx="2"
                                            fill="rgba(56, 189, 248, 0.55)"
                                          />
                                          <g ref={simBubblesGroupRef} opacity={isStepDone ? '1' : '0'}>
                                            <circle cx="8" cy="36" r="2.5" fill="#ffffff">
                                              <animate attributeName="cy" values="42;20;42" dur="0.9s" repeatCount="indefinite" />
                                            </circle>
                                            <circle cx="14" cy="30" r="2" fill="#e0f2fe">
                                              <animate attributeName="cy" values="40;19;40" dur="0.7s" repeatCount="indefinite" />
                                            </circle>
                                            <circle cx="11" cy="24" r="3" fill="#ffffff">
                                              <animate attributeName="cy" values="38;18;38" dur="1.1s" repeatCount="indefinite" />
                                            </circle>
                                            <rect x="-26" y="-22" width="84" height="17" rx="6" fill="#059669" />
                                            <text x="16" y="-10" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800">
                                              ✓ Air Aspirated!
                                            </text>
                                          </g>
                                        </g>
                                      </g>
                                    )}

                                    {/* Guide Arrow for Draw & Advance Steps */}
                                    {(simPracticeStyle === 'guided' || simShowMeHint) &&
                                      (currentSimStep.interactionType === 'draw' ||
                                        currentSimStep.interactionType === 'drag' ||
                                        currentSimStep.interactionType === 'advance') &&
                                      currentSimStep.dragStart &&
                                      currentSimStep.dragEnd && (
                                        <g pointerEvents="none">
                                          <line
                                            x1={currentSimStep.dragStart.x}
                                            y1={currentSimStep.dragStart.y}
                                            x2={currentSimStep.dragEnd.x}
                                            y2={currentSimStep.dragEnd.y}
                                            stroke="#fbbf24"
                                            strokeWidth="3"
                                            strokeDasharray="5 5"
                                            strokeLinecap="round"
                                          />
                                          <circle
                                            cx={currentSimStep.dragStart.x}
                                            cy={currentSimStep.dragStart.y}
                                            r="6.5"
                                            fill="#f59e0b"
                                            stroke="#ffffff"
                                            strokeWidth="1.5"
                                          />
                                          <circle
                                            cx={currentSimStep.dragEnd.x}
                                            cy={currentSimStep.dragEnd.y}
                                            r="6.5"
                                            fill="#10b981"
                                            stroke="#ffffff"
                                            strokeWidth="1.5"
                                          />
                                        </g>
                                      )}

                                    {/* Target Zone Ring */}
                                    {(simPracticeStyle === 'guided' ||
                                      simShowMeHint ||
                                      isStepDone) && (
                                      <circle
                                        cx={currentSimStep.targetZone.x}
                                        cy={currentSimStep.targetZone.y}
                                        r={currentSimStep.targetZone.r}
                                        fill={
                                          isStepDone
                                            ? 'rgba(16, 185, 129, 0.2)'
                                            : simShowMeHint
                                            ? 'rgba(251, 191, 36, 0.28)'
                                            : 'rgba(251, 191, 36, 0.1)'
                                        }
                                        stroke={isStepDone ? '#10b981' : '#fbbf24'}
                                        strokeWidth={simShowMeHint ? '2.5' : '1.8'}
                                        strokeDasharray={simShowMeHint ? 'none' : '4 4'}
                                        pointerEvents="none"
                                      />
                                    )}

                                    {/* Direct DOM Circular Fill Ring for Hold Steps */}
                                    {currentSimStep.interactionType === 'hold' && (
                                      <circle
                                        ref={simHoldCircleRef}
                                        cx={currentSimStep.targetZone.x}
                                        cy={currentSimStep.targetZone.y}
                                        r={currentSimStep.targetZone.r + 4}
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="4.5"
                                        strokeLinecap="round"
                                        opacity="0"
                                        transform={`rotate(-90 ${currentSimStep.targetZone.x} ${currentSimStep.targetZone.y})`}
                                        pointerEvents="none"
                                      />
                                    )}
                                  </svg>

                                  {/* GPU-Accelerated Precision Tool Cursor */}
                                  <div
                                    ref={simCursorOverlayRef}
                                    style={{
                                      position: 'absolute',
                                      left: 0,
                                      top: 0,
                                      width: '1px',
                                      height: '1px',
                                      opacity: 0,
                                      pointerEvents: 'none',
                                      willChange: 'transform',
                                      zIndex: 20
                                    }}
                                  >
                                    <svg
                                      width="40"
                                      height="40"
                                      viewBox="-8 -28 40 40"
                                      className="overflow-visible drop-shadow"
                                      style={{ position: 'relative', left: '-8px', top: '-28px' }}
                                    >
                                      {renderSvgCanvasToolCursor(selectedSimTool)}
                                    </svg>
                                  </div>
                                </div>

                                {/* Guidance Bubble + Percentage & Action Buttons Under Interactive Image */}
                                <div className="space-y-2 pt-0.5">
                                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                                    <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-800 whitespace-nowrap">
                                      {getActionModeLabel(currentSimStep.interactionType)}
                                    </span>
                                    <span
                                      ref={simLiveProgressTextRef}
                                      className={`px-2.5 py-1 rounded-full border text-xs font-extrabold tabular-nums transition-colors ${
                                        isStepDone
                                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                          : 'bg-slate-100 border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {isStepDone ? '100%' : `${simActionProgress}%`}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={handleAutoDemonstrate}
                                        className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold inline-flex items-center gap-1"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span>Show Me</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleResetCurrentStepOnly}
                                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                        <span>Reset</span>
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        disabled={safeStepIndex === 0}
                                        onClick={() => {
                                          const prevIdx = Math.max(0, safeStepIndex - 1);
                                          setSimStepIndex(prevIdx);
                                          setSelectedSimTool(
                                            visibleSimSteps[prevIdx]?.requiredTool || 'tool-hands'
                                          );
                                          setSimFeedbackBanner(null);
                                          setSimShowMeHint(false);
                                          setActiveSimComplication(null);
                                          resetStepGestureBuffers();
                                        }}
                                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-semibold text-slate-700"
                                      >
                                        Back
                                      </button>
                                      <button
                                        type="button"
                                        disabled={safeStepIndex >= visibleSimSteps.length - 1}
                                        onClick={() => {
                                          const nextIdx = Math.min(
                                            visibleSimSteps.length - 1,
                                            safeStepIndex + 1
                                          );
                                          setSimStepIndex(nextIdx);
                                          setSelectedSimTool(
                                            visibleSimSteps[nextIdx]?.requiredTool || 'tool-hands'
                                          );
                                          setSimFeedbackBanner(null);
                                          setSimShowMeHint(false);
                                          setActiveSimComplication(null);
                                          resetStepGestureBuffers();
                                        }}
                                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center gap-1"
                                      >
                                        <span>Next</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Instrument Tray on the Side */}
                              <div className="md:col-span-5 bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/90 space-y-2.5">
                                <div className="space-y-0.5">
                                  <span className="font-bold uppercase tracking-wider text-slate-500 text-[11px] flex items-center gap-1.5">
                                    <Compass className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    <span>Instrument Tray</span>
                                  </span>
                                  <p className="text-[11px] text-slate-500">
                                    Select tool, then scrub, draw, or advance on diagram
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5 max-h-[250px] overflow-y-auto pr-0.5">
                                  {activeSim.tools.map((tool) => {
                                    const isSelected = selectedSimTool === tool.id;
                                    return (
                                      <button
                                        key={tool.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedSimTool(tool.id);
                                          setSimFeedbackBanner(null);
                                        }}
                                        className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-2 text-left ${
                                          isSelected
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        {renderSimToolGlyph(tool.id, 'w-3.5 h-3.5 shrink-0')}
                                        <span className="truncate">{tool.short}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {activeToolObj?.desc && (
                                  <p className="text-[11px] text-slate-500 leading-relaxed pt-1 border-t border-slate-200/70">
                                    <strong className="text-slate-700">
                                      {activeToolObj.name}:
                                    </strong>{' '}
                                    {activeToolObj.desc}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Post-Simulation Debrief Scorecard */}
                          {isAirwaySecured && (
                            <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                                  <Award className="w-4 h-4 text-emerald-600" />
                                  <span>Procedure Debrief Scorecard</span>
                                </div>
                                <p className="text-xs sm:text-sm font-semibold text-emerald-950">
                                  Completed in {formatTime(simElapsedSec)} • Accuracy:{' '}
                                  {Math.max(
                                    0,
                                    Math.round(
                                      (visibleSimSteps.length /
                                        (visibleSimSteps.length + simMistakesCount)) *
                                        100
                                    )
                                  )}
                                  % ({simMistakesCount}{' '}
                                  {simMistakesCount === 1 ? 'correction' : 'corrections'})
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {simPracticeStyle === 'guided' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSimPracticeStyle('exam');
                                      handleRestartSim();
                                    }}
                                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                                  >
                                    Retry in Test Mode
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={handleRestartSim}
                                  className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100"
                                >
                                  Practise Again
                                </button>
                              </div>
                            </div>
                          )}

                          <p className="text-[11px] text-slate-500 px-1">
                            {activeSim.disclaimer}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
          </div>
        )}
      </main>

      {/* ==========================================
          FOOTER: RESOURCES, COURSE FEEDBACK & WEBSITE ISSUES
         ========================================== */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} <strong>PaedTraches</strong> — Paediatric Tracheostomy
            Clinical Education &amp; Reference
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowResourcesModal(true)}
              className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-900"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Recommended Resources</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => {
                setCourseFeedbackDraft((prev) => ({
                  ...prev,
                  moduleTitle: activeModule
                    ? activeModule.title
                    : 'All Learning Modules (Overall Curriculum)'
                }));
                setShowCourseFeedbackModal(true);
              }}
              className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>Course Feedback</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => setShowWebsiteFeedbackModal(true)}
              className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
            >
              <Bug className="w-3.5 h-3.5 text-rose-500" />
              <span>Website Issues / Feedback</span>
            </button>
          </div>
        </div>
      </footer>

      {/* ==========================================
          MODAL 0A: RECOMMENDED EXTERNAL RESOURCES
         ========================================== */}
      {showResourcesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-sky-600" />
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Recommended External Resources
                  </h2>
                  <p className="text-xs text-slate-500">
                    Trusted national UK airway guidelines &amp; paediatric tracheostomy links
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResourcesModal(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-3">
              {externalResources.map((res) => (
                <a
                  key={res.id}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-2xl bg-slate-50 hover:bg-sky-50/70 border border-slate-200 hover:border-sky-300 transition group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-sky-700">
                          {res.category}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {res.organisation}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-800">
                        {res.title}
                      </h3>
                      {res.description && (
                        <p className="text-xs text-slate-600 leading-relaxed">{res.description}</p>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-sky-600 shrink-0 mt-1" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 0B: COURSE CONTENT FEEDBACK
         ========================================== */}
      {showCourseFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitCourseFeedback}
            className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Course Content Feedback</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCourseFeedbackModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {courseFeedbackSaved ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                <div className="text-sm font-bold text-slate-900">Thank you for your feedback!</div>
                <p className="text-xs text-slate-500">
                  Recorded with today&apos;s date ({new Date().toISOString().slice(0, 10)}).
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  Anonymous clinical education evaluation (automatically deleted after 6 months).
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Module / Scope
                  </label>
                  <select
                    value={courseFeedbackDraft.moduleTitle}
                    onChange={(e) =>
                      setCourseFeedbackDraft({
                        ...courseFeedbackDraft,
                        moduleTitle: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
                  >
                    <option value="All Learning Modules (Overall Curriculum)">
                      All Learning Modules (Overall Curriculum)
                    </option>
                    {learningModules.map((m) => (
                      <option key={m.id} value={m.title}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                {[
                  { key: 'relevanceRating', label: '1. Relevance to clinical practice (1–5)' },
                  { key: 'qualityRating', label: '2. Educational quality & clarity (1–5)' },
                  { key: 'objectivesRating', label: '3. Meeting learning objectives (1–5)' },
                  { key: 'overallRating', label: '4. Overall score (1–5)' }
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {field.label}
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() =>
                            setCourseFeedbackDraft({
                              ...courseFeedbackDraft,
                              [field.key]: num
                            })
                          }
                          className={`py-2 rounded-xl text-xs font-bold border transition ${
                            courseFeedbackDraft[field.key] === num
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Comments / Suggestions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={courseFeedbackDraft.comments}
                    onChange={(e) =>
                      setCourseFeedbackDraft({
                        ...courseFeedbackDraft,
                        comments: e.target.value
                      })
                    }
                    placeholder="What went well or could be improved in this clinical module?"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCourseFeedbackModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    Submit Course Feedback
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* ==========================================
          MODAL 0C: WEBSITE ISSUES & GENERAL FEEDBACK (SEPARATE FROM COURSE)
         ========================================== */}
      {showWebsiteFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitWebsiteFeedback}
            className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Website Issues &amp; General Feedback
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWebsiteFeedbackModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {websiteFeedbackSaved ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                <div className="text-sm font-bold text-slate-900">Report received — thank you!</div>
                <p className="text-xs text-slate-500">
                  Logged separately from course evaluations on {new Date().toISOString().slice(0, 10)}.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  Spotted a broken link, mobile layout bug, offline issue, or have a general website idea? Let us know here (separate from clinical course feedback).
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Issue Type
                    </label>
                    <select
                      value={websiteFeedbackDraft.category}
                      onChange={(e) =>
                        setWebsiteFeedbackDraft({
                          ...websiteFeedbackDraft,
                          category: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
                    >
                      <option>Bug / Display Issue</option>
                      <option>Offline / Mobile Issue</option>
                      <option>Feature Request</option>
                      <option>Broken Link</option>
                      <option>General Website Comment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Website Area
                    </label>
                    <select
                      value={websiteFeedbackDraft.area}
                      onChange={(e) =>
                        setWebsiteFeedbackDraft({
                          ...websiteFeedbackDraft,
                          area: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
                    >
                      <option>Homepage / Navigation</option>
                      <option>On-Call Pathways</option>
                      <option>Tube ID / Roadside Tools</option>
                      <option>Learning Modules</option>
                      <option>Procedure Sim</option>
                      <option>Search / Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Describe the Issue or Suggestion *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={websiteFeedbackDraft.message}
                    onChange={(e) =>
                      setWebsiteFeedbackDraft({
                        ...websiteFeedbackDraft,
                        message: e.target.value
                      })
                    }
                    placeholder="Tell us what happened or what would make the website easier to use..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowWebsiteFeedbackModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                  >
                    Submit Website Feedback
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* ==========================================
          MODAL 1: PAEDIATRIC TUBE & HARDWARE ID
         ========================================== */}
      {showTubeIdModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Paediatric Tube &amp; Hardware Identifier (Tube ID)
                </h2>
                <p className="text-xs text-slate-500">
                  Identify cuff inflation fluids, inner cannulae, and roadside actions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTubeIdModal(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {tubeHardwareList.map((item) => {
                const isHighlighted = highlightedTubeId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-4 sm:p-5 border transition space-y-3 ${
                      isHighlighted
                        ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-200'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900">{item.name}</h3>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                        {item.manufacturer}
                      </span>
                    </div>

                    {/* Side-by-Side Adaptive Photo & Specs Layout (Zero Grey Space) */}
                    {item.photoUrl ? (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                        <div className="sm:col-span-5 rounded-xl overflow-hidden border border-slate-200 bg-white">
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            className="w-full h-auto block"
                          />
                        </div>
                        <div className="sm:col-span-7 space-y-2.5">
                          <div className="p-3 rounded-xl bg-white border border-slate-200">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                              Cuff / Valve Type
                            </div>
                            <div className="text-xs font-bold text-slate-900 mt-0.5">
                              {item.cuffType}
                            </div>
                          </div>
                          <div className="p-3 rounded-xl bg-white border border-slate-200">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                              Inner Cannula / Notes
                            </div>
                            <div className="text-xs font-semibold text-slate-800 mt-0.5">
                              {item.innerCannula}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-xl bg-white border border-slate-200">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Cuff / Valve Type
                          </div>
                          <div className="text-xs font-bold text-slate-900 mt-0.5">
                            {item.cuffType}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-white border border-slate-200">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Inner Cannula / Notes
                          </div>
                          <div className="text-xs font-semibold text-slate-800 mt-0.5">
                            {item.innerCannula}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-slate-700 space-y-1.5">
                      <p>
                        <strong className="text-slate-900">Visual Cues:</strong> {item.visualCues}
                      </p>
                      <p className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                        <strong>Roadside Action:</strong> {item.roadsideAction}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: AIRWAY TROUBLESHOOTING
         ========================================== */}
      {showTroubleshootModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Airway Troubleshooting</h2>
                <p className="text-xs text-slate-500">
                  Rapid symptom-based bedside differential &amp; immediate actions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTroubleshootModal(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {INITIAL_TROUBLESHOOT_ITEMS.map((item) => {
                const isSelected = selectedTroubleshootId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-4 border space-y-3 ${
                      isSelected
                        ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {item.symptom}
                      </h3>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          item.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 space-y-1">
                      <div className="font-bold text-slate-900">Likely Causes:</div>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {item.likelyCauses.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 space-y-1">
                      <div className="font-bold text-emerald-800">Immediate Actions:</div>
                      <ol className="list-decimal pl-5 space-y-1">
                        {item.immediateActions.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: A&E PRE-ALERT BUILDER (SBAR)
         ========================================== */}
      {showPreAlertModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-5 sm:px-6 py-4 bg-rose-600 text-white flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold">A&amp;E Pre-Alert Builder</h2>
                <p className="text-xs text-rose-100">
                  Structured SBAR handover for Paediatric Resus &amp; ENT Standby
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreAlertModal(false)}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-bold text-slate-700">Child Age / Weight</span>
                  <input
                    type="text"
                    value={sbarAge}
                    onChange={(e) => setSbarAge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold text-slate-700">Tube Type &amp; Size</span>
                  <input
                    type="text"
                    value={sbarTubeSize}
                    onChange={(e) => setSbarTubeSize(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold text-slate-700">Upper Airway Status</span>
                  <select
                    value={sbarUpperAirway}
                    onChange={(e) => setSbarUpperAirway(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option>Patent (Green Sign)</option>
                    <option>Laryngectomy / Closed (Red Sign)</option>
                    <option>Critical Stenosis / Difficult Upper Airway</option>
                    <option>Unknown</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold text-slate-700">ETA to A&amp;E Resus</span>
                  <input
                    type="text"
                    value={sbarEta}
                    onChange={(e) => setSbarEta(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">
                  Clinical Status &amp; Interventions Performed
                </span>
                <textarea
                  rows={3}
                  value={sbarStatus}
                  onChange={(e) => setSbarStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </label>

              <button
                type="button"
                onClick={handleCopySbar}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition"
              >
                {sbarCopied ? (
                  <>
                    <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                    <span>A&amp;E Pre-Alert Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy A&amp;E Pre-Alert SBAR</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3B: TUBE & SUCTION SIZING CALCULATOR
         ========================================== */}
      {showSizerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <Calculator className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Suction &amp; Tube Sizing Calculator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSizerModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Select Tracheostomy Tube Inner Diameter (ID mm)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {SUCTION_SIZING_TABLE.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedTubeIdSize(row.id)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition ${
                      selectedTubeIdSize === row.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {row.id} mm
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <div className="text-[11px] font-semibold text-emerald-800">
                  Suction Catheter (ID × 2)
                </div>
                <div className="text-xl font-extrabold text-emerald-950 mt-0.5">
                  {currentSizingRow.catFr}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200">
                <div className="text-[11px] font-semibold text-sky-800">Typical Safe Depth</div>
                <div className="text-xl font-extrabold text-sky-950 mt-0.5">
                  {currentSizingRow.depthCm}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                <div className="text-[11px] font-semibold text-amber-800">
                  0.5 mm Downsize Tube
                </div>
                <div className="text-xl font-extrabold text-amber-950 mt-0.5">
                  {currentSizingRow.downsize}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500">Approx Age Guide</div>
                <div className="text-base font-bold text-slate-800 mt-1">
                  {currentSizingRow.ageGuide}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Always defer to the child&apos;s pre-measured suction depth documented on their NTSP
              Bedhead Sign or Caregiver Emergency Card.
            </p>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3C: EMERGENCY GO-BAG CHECKLIST
         ========================================== */}
      {showChecklistModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <ClipboardCheck className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">Emergency Go-Bag Checklist</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBagChecked({})}
                  className="text-xs font-semibold text-slate-500 hover:text-rose-600"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowChecklistModal(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1">
              {EMERGENCY_BAG_CHECKLIST.map((item) => {
                const checked = !!bagChecked[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setBagChecked((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id]
                      }))
                    }
                    className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition flex items-start gap-3 ${
                      checked
                        ? 'bg-emerald-50/60 border-emerald-200 text-slate-400'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                        checked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className={checked ? 'line-through' : 'font-medium'}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 4: ADMIN CONTENT MANAGER
         ========================================== */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                <div>
                  <h2 className="text-base font-extrabold">Admin Content Manager</h2>
                  <p className="text-[11px] text-slate-400">
                    Manage Tube ID photos &amp; design custom Procedure Simulations
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdminSignedIn && (
                  <button
                    type="button"
                    onClick={() => setIsAdminSignedIn(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isAdminSignedIn ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAdminAuthError('');
                  if (auth && adminPassInput.trim()) {
                    try {
                      await signInWithEmailAndPassword(
                        auth,
                        adminEmailInput.trim().toLowerCase(),
                        adminPassInput
                      );
                      setIsAdminSignedIn(true);
                      setAdminPassInput('');
                      return;
                    } catch (err) {
                      setAdminAuthError(
                        err?.message || 'Sign-in failed. Check your Firebase Admin email & password.'
                      );
                      return;
                    }
                  }
                  setIsAdminSignedIn(true);
                }}
                className="p-6 max-w-md mx-auto w-full space-y-4"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">Clinical Editor Sign-In</h3>
                  <p className="text-xs text-slate-500">
                    Sign in with your Firebase Admin email &amp; password (or leave password blank for local preview).
                  </p>
                </div>
                <div className="space-y-2.5">
                  <input
                    type="email"
                    required
                    value={adminEmailInput}
                    onChange={(e) => {
                      setAdminEmailInput(e.target.value);
                      setAdminAuthError('');
                    }}
                    placeholder="Clinical Lead Email"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                  <input
                    type="password"
                    value={adminPassInput}
                    onChange={(e) => {
                      setAdminPassInput(e.target.value);
                      setAdminAuthError('');
                    }}
                    placeholder="Firebase Password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                  {adminAuthError && (
                    <p className="text-xs font-semibold text-rose-600">{adminAuthError}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
                >
                  Open Content Manager
                </button>
              </form>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                {/* Admin Sub-Tabs */}
                <div className="inline-flex flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
                  <button
                    type="button"
                    onClick={() => setAdminTab('tube-id')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      adminTab === 'tube-id'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Tube ID &amp; Photos
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminTab('sims')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      adminTab === 'sims'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Procedure Sim Designer
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminTab('feedback')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      adminTab === 'feedback'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Feedback &amp; Excel ({courseFeedbackLogs.length + websiteFeedbackLogs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminTab('resources')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      adminTab === 'resources'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    External Resources ({externalResources.length})
                  </button>
                </div>

                {/* ADMIN TAB 1: TUBE ID & PHOTO UPLOADER */}
                {adminTab === 'tube-id' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <form
                      onSubmit={handleSaveTubeItem}
                      className="lg:col-span-6 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3"
                    >
                      <h3 className="text-sm font-extrabold text-slate-900">
                        {editingTubeId ? 'Edit Tube / Hardware Item' : 'Add New Tube / Valve'}
                      </h3>
                      <input
                        type="text"
                        required
                        placeholder="Tube / Valve Name (e.g. Bivona TTS 4.0)"
                        value={tubeForm.name}
                        onChange={(e) => setTubeForm({ ...tubeForm, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Manufacturer"
                        value={tubeForm.manufacturer}
                        onChange={(e) => setTubeForm({ ...tubeForm, manufacturer: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Cuff / Valve Type (e.g. Sterile Water Only)"
                        value={tubeForm.cuffType}
                        onChange={(e) => setTubeForm({ ...tubeForm, cuffType: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Inner Cannula Notes"
                        value={tubeForm.innerCannula}
                        onChange={(e) => setTubeForm({ ...tubeForm, innerCannula: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                      <textarea
                        rows={2}
                        placeholder="Visual Cues"
                        value={tubeForm.visualCues}
                        onChange={(e) => setTubeForm({ ...tubeForm, visualCues: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                      <textarea
                        rows={2}
                        placeholder="Roadside Action"
                        value={tubeForm.roadsideAction}
                        onChange={(e) =>
                          setTubeForm({ ...tubeForm, roadsideAction: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />

                      <div className="space-y-2 p-3 rounded-xl bg-white border border-slate-200">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] font-bold text-slate-700">
                            Offline Reference Photo Upload
                          </div>
                          {tubeForm.photoUrl && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              ✓ Stored Offline (No Wi-Fi needed)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Uploaded photos are compressed and embedded directly inside the app so they always load offline on shift.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{tubeForm.photoUrl ? 'Replace Uploaded Photo' : 'Upload Photo from Device'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handlePhotoFileUpload(e.target.files?.[0], (dataUrl) =>
                                  setTubeForm((prev) => ({ ...prev, photoUrl: dataUrl }))
                                )
                              }
                            />
                          </label>
                          {tubeForm.photoUrl && (
                            <button
                              type="button"
                              onClick={() => setTubeForm({ ...tubeForm, photoUrl: '' })}
                              className="text-xs text-rose-600 font-semibold"
                            >
                              Remove Photo
                            </button>
                          )}
                        </div>
                        {tubeForm.photoUrl && (
                          <div className="rounded-xl overflow-hidden border border-slate-200 max-w-[200px]">
                            <img
                              src={tubeForm.photoUrl}
                              alt="Preview"
                              className="w-full h-auto block"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                        >
                          {editingTubeId ? 'Save Changes' : 'Add to Tube ID'}
                        </button>
                        {editingTubeId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTubeId(null);
                              setTubeForm({
                                name: '',
                                manufacturer: '',
                                cuffType: '',
                                innerCannula: '',
                                visualCues: '',
                                roadsideAction: '',
                                photoUrl: ''
                              });
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>

                    <div className="lg:col-span-6 space-y-2.5">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Saved Tube ID Items ({tubeHardwareList.length})
                      </h3>
                      {tubeHardwareList.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {item.photoUrl ? (
                              <img
                                src={item.photoUrl}
                                alt={item.name}
                                className="w-12 h-auto rounded-lg border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {item.name}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {item.cuffType}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTubeId(item.id);
                                setTubeForm({
                                  name: item.name,
                                  manufacturer: item.manufacturer,
                                  cuffType: item.cuffType,
                                  innerCannula: item.innerCannula,
                                  visualCues: item.visualCues,
                                  roadsideAction: item.roadsideAction,
                                  photoUrl: item.photoUrl || ''
                                });
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setTubeHardwareList((prev) => prev.filter((x) => x.id !== item.id))
                              }
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ADMIN TAB 2: PROCEDURE SIM DESIGNER */}
                {adminTab === 'sims' && (
                  <div className="space-y-5">
                    {/* Create New Simulation */}
                    <form
                      onSubmit={handleCreateCustomSim}
                      className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row gap-2.5"
                    >
                      <input
                        type="text"
                        required
                        placeholder="New Procedure Sim Title (e.g. Rigid Bronchoscopy Setup)"
                        value={newSimTitle}
                        onChange={(e) => setNewSimTitle(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-indigo-200 bg-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Short subtitle..."
                        value={newSimSubtitle}
                        onChange={(e) => setNewSimSubtitle(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-indigo-200 bg-white text-xs"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Sim</span>
                      </button>
                    </form>

                    {adminSelectedSim && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Select Sim + Upload Custom Diagram + Tap-to-Place Hotspot */}
                        <div className="lg:col-span-6 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <select
                              value={adminSelectedSim.id}
                              onChange={(e) => {
                                setAdminSimId(e.target.value);
                                setAdminSelectedStepIdx(0);
                              }}
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                            >
                              {procedureSims.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.title}
                                </option>
                              ))}
                            </select>

                            <label className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold cursor-pointer inline-flex items-center gap-1 shrink-0">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Custom Diagram</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handlePhotoFileUpload(e.target.files?.[0], (dataUrl) => {
                                    setProcedureSims((prev) =>
                                      prev.map((s) =>
                                        s.id === adminSelectedSim.id
                                          ? {
                                              ...s,
                                              diagramType: 'custom-image',
                                              customDiagramUrl: dataUrl
                                            }
                                          : s
                                      )
                                    );
                                  })
                                }
                              />
                            </label>
                          </div>

                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-slate-500">
                              Tap anywhere on the diagram below to place the new step&apos;s target
                              hotspot ({stepForm.targetX}, {stepForm.targetY}):
                            </div>
                            <svg
                              viewBox="0 0 500 340"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = Math.round(((e.clientX - rect.left) / rect.width) * 500);
                                const y = Math.round(((e.clientY - rect.top) / rect.height) * 340);
                                setStepForm((prev) => ({ ...prev, targetX: x, targetY: y }));
                              }}
                              className="w-full h-auto rounded-2xl border-2 border-slate-800 bg-slate-950 cursor-crosshair"
                            >
                              {adminSelectedSim.diagramType === 'custom-image' &&
                              adminSelectedSim.customDiagramUrl ? (
                                <image
                                  href={adminSelectedSim.customDiagramUrl}
                                  x="0"
                                  y="0"
                                  width="500"
                                  height="340"
                                  preserveAspectRatio="xMidYMid meet"
                                />
                              ) : (
                                <rect x="140" y="30" width="220" height="280" rx="24" fill="#1e293b" />
                              )}
                              <circle
                                cx={stepForm.targetX}
                                cy={stepForm.targetY}
                                r={stepForm.targetR}
                                fill="rgba(251, 191, 36, 0.25)"
                                stroke="#fbbf24"
                                strokeWidth="2.5"
                              />
                            </svg>
                          </div>

                          {/* Existing Steps List */}
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {adminSelectedSim.steps.map((st, i) => (
                              <div
                                key={st.id}
                                className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                  adminSelectedStepIdx === i
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-700 border-slate-200'
                                }`}
                              >
                                <span className="truncate">
                                  {i + 1}. {st.title} ({(st.ageGroups || ['all']).join(', ')})
                                </span>
                                {adminSelectedSim.steps.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setProcedureSims((prev) =>
                                        prev.map((s) =>
                                          s.id === adminSelectedSim.id
                                            ? {
                                                ...s,
                                                steps: s.steps.filter((x) => x.id !== st.id)
                                              }
                                            : s
                                        )
                                      )
                                    }
                                    className="text-rose-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Add Step Form with Age Group Assignment */}
                        <form
                          onSubmit={handleAddStepToAdminSim}
                          className="lg:col-span-6 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3"
                        >
                          <h4 className="text-sm font-extrabold text-slate-900">
                            Add Step to &ldquo;{adminSelectedSim.title}&rdquo;
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Phase (e.g. 2. Incision)"
                              value={stepForm.phase}
                              onChange={(e) => setStepForm({ ...stepForm, phase: e.target.value })}
                              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                            />
                            <select
                              value={stepForm.ageFilter}
                              onChange={(e) =>
                                setStepForm({ ...stepForm, ageFilter: e.target.value })
                              }
                              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                            >
                              <option value="all">All Ages</option>
                              <option value="infant-child">Infant &amp; Child (&lt;8 yrs)</option>
                              <option value="infant">Infant (&lt;1 yr) Only</option>
                              <option value="child">Child (2–6 yrs) Only</option>
                              <option value="adolescent">Adolescent (&gt;10 yrs) Only</option>
                            </select>
                          </div>
                          <input
                            type="text"
                            required
                            placeholder="Step Title"
                            value={stepForm.title}
                            onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                          />
                          <textarea
                            rows={2}
                            placeholder="Step Instruction"
                            value={stepForm.instruction}
                            onChange={(e) =>
                              setStepForm({ ...stepForm, instruction: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                          />
                          <textarea
                            rows={2}
                            placeholder="ENT / Surgical Pearl"
                            value={stepForm.traineeTip}
                            onChange={(e) =>
                              setStepForm({ ...stepForm, traineeTip: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={stepForm.requiredTool}
                              onChange={(e) =>
                                setStepForm({ ...stepForm, requiredTool: e.target.value })
                              }
                              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                            >
                              {adminSelectedSim.tools.map((t) => (
                                <option key={t.id} value={t.id}>
                                  Tool: {t.short}
                                </option>
                              ))}
                            </select>
                            <select
                              value={stepForm.interactionType}
                              onChange={(e) =>
                                setStepForm({ ...stepForm, interactionType: e.target.value })
                              }
                              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                            >
                              <option value="hold">Press &amp; Hold</option>
                              <option value="paint">Scrub / Paint Area</option>
                              <option value="draw">Trace / Incise Line</option>
                              <option value="advance">Push / Advance Tract</option>
                              <option value="tap">Tap Target</option>
                            </select>
                          </div>
                          <button
                            type="submit"
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            Add Step to Simulation
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {/* ADMIN TAB 3: FEEDBACK & BRANDED EXCEL EXPORT */}
                {adminTab === 'feedback' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setAdminFeedbackSubTab('course')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            adminFeedbackSubTab === 'course'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Course Feedback ({courseFeedbackLogs.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdminFeedbackSubTab('website')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            adminFeedbackSubTab === 'website'
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Website Issues / Feedback ({websiteFeedbackLogs.length})
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold">
                          Auto-deletes entries &gt; 6 months old
                        </span>
                        {adminFeedbackSubTab === 'course' ? (
                          <button
                            type="button"
                            onClick={() =>
                              downloadPaedTrachesCourseFeedbackExcel(courseFeedbackLogs)
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Excel (.xls)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              downloadPaedTrachesWebsiteFeedbackExcel(websiteFeedbackLogs)
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Issues Excel (.xls)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {adminFeedbackSubTab === 'course' ? (
                      <div className="space-y-2.5">
                        {courseFeedbackLogs.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-6">
                            No course feedback entries within the last 6 months.
                          </p>
                        ) : (
                          courseFeedbackLogs.map((fb) => (
                            <div
                              key={fb.id}
                              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] font-bold text-slate-600">
                                    {fb.submittedAt}
                                  </span>
                                  <span className="font-bold text-slate-900">{fb.moduleTitle}</span>
                                </div>
                                {fb.comments && (
                                  <p className="text-slate-600 italic">&ldquo;{fb.comments}&rdquo;</p>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 shrink-0 font-semibold">
                                <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700">
                                  Rel: {fb.relevanceRating}/5
                                </span>
                                <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700">
                                  Qual: {fb.qualityRating}/5
                                </span>
                                <span
                                  className={`px-2.5 py-1 rounded-lg border font-extrabold ${getScoreBadgeClasses(
                                    fb.overallRating
                                  )}`}
                                >
                                  Overall: {fb.overallRating}/5
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCourseFeedbackLogs((prev) =>
                                      prev.filter((x) => x.id !== fb.id)
                                    )
                                  }
                                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600"
                                  title="Delete entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {websiteFeedbackLogs.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-6">
                            No website issues or general feedback logged within the last 6 months.
                          </p>
                        ) : (
                          websiteFeedbackLogs.map((wf) => (
                            <div
                              key={wf.id}
                              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] font-bold text-slate-600">
                                    {wf.submittedAt}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[11px]">
                                    {wf.category}
                                  </span>
                                  <span className="font-semibold text-slate-500">
                                    Area: {wf.area}
                                  </span>
                                </div>
                                <p className="text-slate-800">{wf.message}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setWebsiteFeedbackLogs((prev) =>
                                    prev.filter((x) => x.id !== wf.id)
                                  )
                                }
                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ADMIN TAB 4: RECOMMENDED EXTERNAL RESOURCES MANAGER */}
                {adminTab === 'resources' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <form
                      onSubmit={handleAddExternalResource}
                      className="lg:col-span-5 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 self-start"
                    >
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Add Recommended External Link
                      </h3>
                      <input
                        type="text"
                        required
                        placeholder="Resource Title *"
                        value={resourceForm.title}
                        onChange={(e) =>
                          setResourceForm({ ...resourceForm, title: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Organisation (e.g. NTSP)"
                          value={resourceForm.organisation}
                          onChange={(e) =>
                            setResourceForm({ ...resourceForm, organisation: e.target.value })
                          }
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Category"
                          value={resourceForm.category}
                          onChange={(e) =>
                            setResourceForm({ ...resourceForm, category: e.target.value })
                          }
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                        />
                      </div>
                      <input
                        type="url"
                        required
                        placeholder="https://..."
                        value={resourceForm.url}
                        onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                      />
                      <textarea
                        rows={2}
                        placeholder="Brief description of why we recommend this resource..."
                        value={resourceForm.description}
                        onChange={(e) =>
                          setResourceForm({ ...resourceForm, description: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                      />
                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        + Add External Resource
                      </button>
                    </form>

                    <div className="lg:col-span-7 space-y-2.5">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Published External Resources ({externalResources.length})
                      </h3>
                      {externalResources.map((res) => (
                        <div
                          key={res.id}
                          className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-bold text-slate-900">{res.title}</div>
                            <div className="text-[11px] text-slate-500">
                              {res.organisation} • {res.category}
                            </div>
                            <a
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-sky-700 hover:underline truncate block"
                            >
                              {res.url}
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setExternalResources((prev) => prev.filter((x) => x.id !== res.id))
                            }
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}