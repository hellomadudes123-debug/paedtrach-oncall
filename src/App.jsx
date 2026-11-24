import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage';
import {
  Activity,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Calculator,
  Timer,
  ClipboardCheck,
  Smartphone,
  Play,
  Pause,
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  Video,
  Image as ImageIcon,
  X,
  ShieldAlert,
  Check,
  FolderPlus,
  Layers,
  Lock,
  Unlock,
  HelpCircle,
  Sparkles,
  ArrowUp,
  ArrowDown,
  LogOut,
  KeyRound,
  Copy,
  Download,
  Upload,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Users,
  Cloud,
  FileText,
  Scale,
  UserPlus,
  History,
  Loader2,
  ShieldCheck,
  Search,
  List,
  ListOrdered,
  Bold,
  Heading2,
  Table,
  Award,
  Radio,
  AlertTriangle,
  Info,
  Printer,
  Eye,
  Target,
  MessageSquarePlus,
  Stethoscope,
  RotateCw,
  Moon,
  Sun,
  UserCheck,
  FileDown,
  Package,
  Wrench,
  HardDriveDownload,
  Crosshair,
  HeartPulse,
  BookMarked,
  Compass
} from 'lucide-react';

// ==========================================
// CLOUD DATABASE, AUTH & STORAGE INITIALIZATION
// ==========================================
const PASTE_YOUR_FIREBASE_CONFIG_HERE = { 
  apiKey: "AIzaSyCJr5EtomUlvIQiqyOXw7jG7K9W4bUulgk",
  authDomain: "paedtrach-oncall.firebaseapp.com",
  projectId: "paedtrach-oncall",
  storageBucket: "paedtrach-oncall.firebasestorage.app",
  messagingSenderId: "928358075073",
  appId: "1:928358075073:web:82b4cc602d749a32406240"
};

const resolveSafeFirebaseConfig = () => {
  try {
    if (
      PASTE_YOUR_FIREBASE_CONFIG_HERE &&
      typeof PASTE_YOUR_FIREBASE_CONFIG_HERE === 'object' &&
      PASTE_YOUR_FIREBASE_CONFIG_HERE.apiKey
    ) {
      return PASTE_YOUR_FIREBASE_CONFIG_HERE;
    }
    const rawLocal = localStorage.getItem('paedtrach_custom_firebase_config');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && parsed.apiKey) return parsed;
    }
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return typeof __firebase_config === 'string'
        ? JSON.parse(__firebase_config)
        : __firebase_config;
    }
  } catch (e) {
    console.warn('Firebase config fallback:', e);
  }
  return null;
};

const firebaseConfig = resolveSafeFirebaseConfig();
let app = null;
let auth = null;
let db = null;
let storage = null;
let secondaryApp = null;
let secondaryAuth = null;

try {
  if (firebaseConfig && firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    secondaryApp = initializeApp(firebaseConfig, 'PaedTrachesAdminProvisioner');
    secondaryAuth = getAuth(secondaryApp);
  }
} catch (e) {
  console.warn('Running in offline fallback mode:', e);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'paedtrach-oncall-pwa';

const getEmbedVideoInfo = (url = '') => {
  if (!url) return { type: 'none', src: '' };
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'iframe',
      src: `https://www.youtube.com/embed/${ytMatch[1]}`
    };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'iframe',
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`
    };
  }
  if (
    url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ||
    url.includes('firebasestorage.googleapis.com')
  ) {
    return { type: 'video', src: url };
  }
  return { type: 'link', src: url };
};

// ==========================================
// RICH TEXT FORMATTER FOR LEARNING MODULES
// ==========================================
const renderInlineBold = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

const RichFormattedText = ({ text = '', largeText = false }) => {
  if (!text) return null;
  const lines = text.split('\n');
  const blocks = [];
  let currentList = null;

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    if (line.startsWith('## ')) {
      flushList();
      blocks.push({ type: 'heading', content: line.slice(3), key: `h-${idx}` });
    } else if (/^[-*•]\s+/.test(line)) {
      const itemText = line.replace(/^[-*•]\s+/, '');
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [], key: `ul-${idx}` };
      }
      currentList.items.push(itemText);
    } else if (/^\d+[.)]\s+/.test(line)) {
      const itemText = line.replace(/^\d+[.)]\s+/, '');
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [], key: `ol-${idx}` };
      }
      currentList.items.push(itemText);
    } else {
      flushList();
      blocks.push({ type: 'p', content: line, key: `p-${idx}` });
    }
  });
  flushList();

  return (
    <div
      className={`space-y-3.5 text-slate-600 leading-relaxed ${
        largeText ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
      }`}
    >
      {blocks.map((block) => {
        if (block.type === 'heading') {
          return (
            <h3
              key={block.key}
              className={`font-bold text-slate-900 pt-2 ${
                largeText ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
              }`}
            >
              {renderInlineBold(block.content)}
            </h3>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={block.key} className="space-y-2 pl-1 text-slate-700">
              {block.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2.5 shrink-0" />
                  <span>{renderInlineBold(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={block.key} className="space-y-2 pl-1 text-slate-700">
              {block.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center mt-0.5 shrink-0">
                    {i + 1}
                  </span>
                  <span>{renderInlineBold(item)}</span>
                </li>
              ))}
            </ol>
          );
        }
        return <p key={block.key}>{renderInlineBold(block.content)}</p>;
      })}
    </div>
  );
};

// ==========================================
// CUSTOM PAEDTRACHES VECTOR LOGO EMBLEM
// ==========================================
const PaedTrachesLogo = ({ className = 'w-9 h-9' }) => (
  <div
    className={`${className} rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xs group-hover:from-emerald-600 group-hover:to-teal-800 transition shrink-0`}
  >
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className="w-5 h-5"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="5"
        y="9"
        width="22"
        height="5"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M12.5 5H19.5V9H12.5V5Z"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 14V18.5C13.5 22.5 16 25.5 20.5 26.5M18.5 14V17.5C18.5 19.8 19.8 21.5 22.5 22.2"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <circle cx="9" cy="11.5" r="1" fill="currentColor" />
      <circle cx="23" cy="11.5" r="1" fill="currentColor" />
    </svg>
  </div>
);

// ==========================================
// INITIAL CLINICAL DATA (2026/27 EDITION)
// ==========================================
const INITIAL_ADMIN_USERS = [
  {
    id: 'adm-lead',
    name: 'Lead Clinical Editor',
    email: 'lead@paedtrach.org.uk',
    role: 'Clinical Lead (Super Admin)',
    addedAt: '2026-01-15'
  }
];

const INITIAL_GOVERNANCE_META = {
  version: 'v3.3 (2026/27 Edition)',
  clinicalLead: 'Paediatric Airway & Pre-Hospital Education Group',
  lastReviewed: '2026-02-18',
  nextReviewDue: '2027-02-18',
  mhraNotice:
    'Classified as an open-access clinical reference & educational pathway visualiser (not a bespoke diagnostic calculator or Class I Medical Device under UK MDR 2002 / MHRA guidance). Clinicians must apply independent professional judgement and verify against current JRCALC / local NHS Ambulance Trust guidelines.'
};

const INITIAL_PATHWAYS = [
  {
    id: 'ntsp-green',
    title: 'Tracheostomy Emergency',
    subtitle: 'Patent upper airway — mouth & nose connect to lungs',
    category: 'emergency',
    theme: 'green',
    badge: 'NTSP Green Pathway',
    startNodeId: 'gov-check',
    references: [
      {
        id: 'ref-ntsp-paed',
        title: 'NTSP Paediatric Tracheostomy Emergency Algorithm (Green)',
        source: 'National Tracheostomy Safety Project',
        url: 'https://www.tracheostomy.org.uk/healthcare-staff/emergency-care/paediatric-emergency-algorithms'
      },
      {
        id: 'ref-rcuk-pbls',
        title: 'Paediatric Basic Life Support (Tracheostomy Modifications)',
        source: 'Resuscitation Council UK',
        url: 'https://www.resus.org.uk/library/2021-resuscitation-guidelines/paediatric-basic-life-support-guidelines'
      },
      {
        id: 'ref-nice-airway',
        title: 'NICE Feverish Illness & Acute Paediatric Airway Assessment (NG143)',
        source: 'NICE Guidance',
        url: 'https://www.nice.org.uk/guidance/ng143'
      }
    ],
    nodes: [
      {
        id: 'gov-check',
        type: 'governance',
        title: 'Confirm Local Guidance & Bedhead Sign',
        subtitle: 'Check local Trust / JRCALC protocol and identify airway type before starting.',
        criticalNote: 'Verify the patient’s Bedhead Sign or Caregiver Emergency Card for tube size, suction depth, and upper airway status.',
        checklist: [
          'Request Critical Care or senior backup early if unwell',
          'Check Bedhead Sign / Red Book for tube size & suction depth',
          'Locate the child’s Emergency Tracheostomy Go-Bag',
          'Confirm upper airway is potentially patent (Green Pathway)'
        ],
        question: 'Ready to begin airway assessment?',
        nextId: 'assess-breathing'
      },
      {
        id: 'assess-breathing',
        type: 'action',
        title: 'Open Airway & Apply Dual-Site Oxygen',
        subtitle: 'Expose the neck, remove attachments, and look/listen/feel at both airways.',
        criticalNote: 'Avoid hyperextending a child’s neck as the paediatric trachea is soft and easily compressed.',
        checklist: [
          'Position head in neutral alignment using a small shoulder roll',
          'Remove speaking valve, cap, or humidification (HME) filter immediately',
          'Apply high-flow oxygen to BOTH the tracheostomy and mouth/nose',
          'Look, listen, and feel for breathing at tube and mouth for 10 seconds'
        ],
        question: 'Is the child breathing with signs of life?',
        yesLabel: 'Yes — Breathing (Distressed)',
        yesId: 'check-patency',
        noLabel: 'No — Apnoeic or Gasping',
        noId: 'rescue-breaths'
      },
      {
        id: 'rescue-breaths',
        type: 'emergency',
        title: 'Deliver 5 Rescue Breaths',
        subtitle: 'Attempt ventilation directly via the tracheostomy tube hub first.',
        criticalNote: 'Attach paediatric BVM to the 15mm tracheostomy connector. If chest does not rise, assess tube patency immediately.',
        checklist: [
          'Deliver 5 rescue breaths via the tracheostomy tube',
          'Watch carefully for visible chest rise',
          'Check central pulse and signs of life'
        ],
        question: 'Did the chest rise effectively with rescue breaths?',
        yesLabel: 'Yes — Chest Rising',
        yesId: 'start-bls',
        noLabel: 'No — Blocked or Displaced',
        noId: 'check-patency'
      },
      {
        id: 'check-patency',
        type: 'decision',
        title: 'Assess Tracheostomy Tube Patency',
        subtitle: 'Pass a flexible suction catheter to rule out blockage or displacement.',
        criticalNote: 'Never use a rigid Yankauer sucker inside a tracheostomy tube. Use a flexible catheter sized at double the tube ID.',
        checklist: [
          'Remove inner cannula if present (rare in small paediatric tubes)',
          'Gently pass a correct-size suction catheter to the child’s pre-measured depth',
          'Assess whether the catheter passes smoothly into the trachea'
        ],
        question: 'Does the suction catheter pass easily down the tube?',
        yesLabel: 'Yes — Tube is Patent',
        yesId: 'suction-stabilise',
        noLabel: 'No — Catheter Will Not Pass',
        noId: 'deflate-cuff'
      },
      {
        id: 'suction-stabilise',
        type: 'action',
        title: 'Suction Airway & Complete ABCDE',
        subtitle: 'The tracheostomy tube is patent and sits within the airway.',
        criticalNote: 'Apply suction only while withdrawing the catheter for no more than 5 to 10 seconds.',
        checklist: [
          'Suction secretions or blood to clear the lumen',
          'Assist ventilation via tracheostomy if hypoventilating',
          'Auscultate both lungs and monitor continuous EtCO2',
          'Prepare for hospital transfer with caregiver and spare equipment'
        ],
        question: 'Is the child improving after suctioning?',
        yesLabel: 'Yes — Stabilising',
        yesId: 'post-care',
        noLabel: 'No — Deteriorating',
        noId: 'start-bls'
      },
      {
        id: 'deflate-cuff',
        type: 'emergency',
        title: 'Deflate Cuff (If Present) & Reassess',
        subtitle: 'Allow airflow around the blocked tube to reach the upper airway.',
        criticalNote: 'Most paediatric tubes are uncuffed, or use sterile water or air cuffs. Check the pilot balloon.',
        checklist: [
          'If a pilot balloon is present, aspirate completely with a syringe',
          'Reassess airflow at mouth, nose, and tracheostomy',
          'Prepare immediately for tube removal if obstruction persists'
        ],
        question: 'Has deflating the cuff relieved the obstruction?',
        yesLabel: 'Yes — Breathing Improved',
        yesId: 'post-care',
        noLabel: 'No — Still Obstructed',
        noId: 'remove-tube'
      },
      {
        id: 'remove-tube',
        type: 'emergency',
        title: 'Remove Tracheostomy Tube Immediately',
        subtitle: 'A blocked or displaced tube blocks the trachea and must be removed.',
        criticalNote: 'Release Velcro ties or cut cotton tapes with blunt-ended scissors and withdraw the tube in a smooth downward curve.',
        checklist: [
          'Release or cut neck ties safely while supporting the neck',
          'Withdraw the blocked or displaced tracheostomy tube completely',
          'Suction visible secretions at the open neck stoma',
          'Reassess breathing at BOTH the stoma and mouth/nose'
        ],
        question: 'Trained to replace tube OR trained caregiver present?',
        yesLabel: 'Yes — Attempt Tube Change',
        yesId: 'replace-tube',
        noLabel: 'No — Emergency Ventilation',
        noId: 'emergency-oxygenation'
      },
      {
        id: 'replace-tube',
        type: 'action',
        title: 'Emergency Tube Replacement',
        subtitle: 'Insert spare tube from the patient’s Emergency Go-Bag.',
        criticalNote: 'Never force a tube into the stoma. Remove the solid obturator immediately after the tube enters the stoma.',
        checklist: [
          'First attempt: Insert lubricated same-size spare tube with obturator in place',
          'Immediately remove the obturator once inserted so the child can breathe',
          'If unsuccessful: Attempt insertion with the 0.5 mm smaller downsize tube',
          'Confirm placement with waveform EtCO2, chest rise, and suction catheter pass'
        ],
        question: 'Was the replacement tube successfully placed?',
        yesLabel: 'Yes — Tube Confirmed',
        yesId: 'post-care',
        noLabel: 'No — Unable to Replace',
        noId: 'emergency-oxygenation'
      },
      {
        id: 'emergency-oxygenation',
        type: 'emergency',
        title: 'Emergency Stoma or Oral Ventilation',
        subtitle: 'Ventilate using either the upper airway or the open neck stoma.',
        criticalNote: 'When ventilating via the mouth/nose, occlude the neck stoma with gauze so air does not escape out of the neck.',
        checklist: [
          'Oral route: Cover stoma firmly with sterile gauze and ventilate via mouth/nose BVM',
          'Stoma route: Seal a neonatal circular mask directly over the neck stoma and ventilate',
          'Secondary option: Insert oral supraglottic airway (i-gel/LMA) while occluding stoma',
          'Verify visible chest movement and waveform capnography'
        ],
        question: 'Are there signs of life and heart rate above 60 bpm?',
        yesLabel: 'Yes — Signs of Life Present',
        yesId: 'post-care',
        noLabel: 'No — HR < 60 or No Pulse',
        noId: 'start-bls'
      },
      {
        id: 'start-bls',
        type: 'emergency',
        title: 'Paediatric BLS (15:2 Compressions)',
        subtitle: 'Start chest compressions for heart rate under 60 bpm with poor perfusion.',
        criticalNote: 'Use the 2-Minute CPR Timer at the top of the pathway to track cycles.',
        checklist: [
          'Perform chest compressions at 100–120/min (15 compressions : 2 breaths)',
          'Ensure chest rise on ventilations via tube, stoma, or upper airway',
          'Attach defibrillator pads and follow Paediatric ALS guidance',
          'Pass urgent pre-alert to receiving Paediatric Emergency Department'
        ],
        question: 'Has spontaneous circulation and breathing stabilised?',
        nextId: 'post-care'
      },
      {
        id: 'post-care',
        type: 'action',
        title: 'Post-Stabilisation & Hospital Handover',
        subtitle: 'Secure the airway and transport with the child’s emergency kit.',
        criticalNote: 'Always bring the child’s Emergency Tracheostomy Go-Bag and caregiver in the ambulance.',
        checklist: [
          'Secure tracheostomy ties snugly (allow one finger space at the neck)',
          'Maintain continuous waveform EtCO2 and SpO2 monitoring',
          'Keep portable suction unit switched on at the bedside during transit',
          'Pre-alert hospital ENT / Anaesthetic team if tube was removed or downsized'
        ]
      }
    ]
  },
  {
    id: 'ntsp-red',
    title: 'Laryngectomy / Stoma-Only Emergency',
    subtitle: 'No upper airway connection — oxygenate and ventilate via neck stoma only',
    category: 'emergency',
    theme: 'red',
    badge: 'NTSP Red Pathway',
    startNodeId: 'red-gov',
    references: [
      {
        id: 'ref-ntsp-red',
        title: 'NTSP Laryngectomy / Stoma-Only Emergency Algorithm (Red)',
        source: 'National Tracheostomy Safety Project',
        url: 'https://www.tracheostomy.org.uk/healthcare-staff/emergency-care/laryngectomy-algorithm'
      },
      {
        id: 'ref-das-trach',
        title: 'Difficult Airway Society & ENT UK Neck-Breather Guidelines',
        source: 'DAS / ENT UK',
        url: 'https://das.uk.com/guidelines/'
      }
    ],
    nodes: [
      {
        id: 'red-gov',
        type: 'governance',
        title: 'Confirm Local Guidance & Red Bedhead Sign',
        subtitle: 'Neck-only breather — mouth and nose do not connect to the lungs.',
        criticalNote: 'Do NOT attempt oral oxygenation or oral intubation unless the patient’s care plan explicitly states otherwise.',
        checklist: [
          'Confirm RED Bedhead Sign or known complete upper airway obstruction',
          'Request immediate Critical Care support and ENT pre-alert',
          'Locate the child’s Emergency Tracheostomy Go-Bag'
        ],
        question: 'Proceed to neck-only airway assessment?',
        nextId: 'red-oxygen'
      },
      {
        id: 'red-oxygen',
        type: 'emergency',
        title: 'Apply Oxygen to Neck Stoma Only',
        subtitle: 'Expose the neck stoma and remove any valve or filter covers.',
        criticalNote: 'All assessment, oxygenation, and ventilation must take place directly at the neck stoma.',
        checklist: [
          'Apply high-flow oxygen directly over the neck stoma / tube',
          'Remove HME filter, speaking valve, or stoma cover',
          'Remove inner cannula if present',
          'Look, listen, and feel at the neck stoma for 10 seconds'
        ],
        question: 'Does a flexible suction catheter pass easily through the tube?',
        yesLabel: 'Yes — Catheter Passes',
        yesId: 'red-suction',
        noLabel: 'No — Blocked or Displaced',
        noId: 'red-remove'
      },
      {
        id: 'red-suction',
        type: 'action',
        title: 'Suction & Ventilate via Neck Tube',
        subtitle: 'Tube is patent inside the trachea.',
        criticalNote: 'Attach paediatric BVM with 15mm connector directly to the tracheostomy hub if ventilation is needed.',
        checklist: [
          'Suction secretions to clear the airway lumen',
          'If apnoeic, deliver 5 rescue breaths via the tracheostomy tube',
          'Monitor continuous waveform EtCO2 at the tracheostomy hub'
        ],
        question: 'Proceed to post-stabilisation care?',
        nextId: 'red-post'
      },
      {
        id: 'red-remove',
        type: 'emergency',
        title: 'Remove Blocked Tube & Ventilate Stoma',
        subtitle: 'Clear the stoma and replace tube or ventilate directly over the neck.',
        criticalNote: 'NEVER occlude the stoma in a Red Pathway patient — it is their only airway.',
        checklist: [
          'Deflate cuff (if present) and remove the blocked/displaced tube immediately',
          'Attempt replacement with same-size or 0.5 mm smaller spare tube',
          'If tube cannot be replaced, seal a neonatal circular mask or paediatric i-gel over the open neck stoma to ventilate'
        ],
        question: 'Proceed to ongoing resuscitation and transport?',
        nextId: 'red-post'
      },
      {
        id: 'red-post',
        type: 'action',
        title: 'Stoma Security & Urgent Transfer',
        subtitle: 'Keep the neck stoma clear and continuously monitored.',
        criticalNote: 'Maintain neutral head position so neck skin folds do not cover the open stoma.',
        checklist: [
          'Confirm continuous waveform EtCO2 trace at the neck airway',
          'Start 15:2 chest compressions if HR < 60 bpm with poor perfusion',
          'Blue-light transfer with receiving ENT / Anaesthetic pre-alert'
        ]
      }
    ]
  },
  {
    id: 'paed-bls-mod',
    title: 'Paediatric Tracheostomy BLS',
    subtitle: 'Modified resuscitation sequence for bradycardia (HR < 60) or cardiac arrest',
    category: 'emergency',
    theme: 'blue',
    badge: 'Modified Resuscitation',
    startNodeId: 'bls-gov',
    references: [
      {
        id: 'ref-rcuk-pals',
        title: 'Resuscitation Council UK: Paediatric Advanced Life Support (2021)',
        source: 'Resuscitation Council UK',
        url: 'https://www.resus.org.uk/library/2021-resuscitation-guidelines/paediatric-advanced-life-support-guidelines'
      },
      {
        id: 'ref-nice-resus',
        title: 'JRCALC / NICE Pre-Hospital Paediatric Resuscitation Standards',
        source: 'JRCALC / NICE',
        url: 'https://www.nice.org.uk/guidance/conditions-and-diseases/injuries-accidents-and-wounds/trauma'
      }
    ],
    nodes: [
      {
        id: 'bls-gov',
        type: 'governance',
        title: 'Confirm Unresponsiveness & Local Guidance',
        subtitle: 'Paediatric arrest in tracheostomy patients is almost always hypoxic in origin.',
        criticalNote: 'Follow local Ambulance Trust / JRCALC guidelines. Clearing a blocked tracheostomy is the highest priority.',
        checklist: [
          'Confirm unresponsiveness and position head in neutral alignment',
          'Strip speaking valve, cap, or HME filter from the tracheostomy hub',
          'Call for resuscitation backup and defibrillator'
        ],
        question: 'Ready to deliver 5 rescue breaths?',
        nextId: 'bls-breaths'
      },
      {
        id: 'bls-breaths',
        type: 'emergency',
        title: 'Deliver 5 Rescue Breaths & Check Rise',
        subtitle: 'Verify visible chest movement on every breath.',
        criticalNote: 'If the chest fails to rise on the first 2 breaths via the tube, assume the tube is blocked or displaced.',
        checklist: [
          'Attach BVM to the tracheostomy hub and attempt 5 rescue breaths',
          'If high resistance or no chest rise: pass suction catheter or remove tube immediately',
          'Once patent (or removed), deliver 5 effective breaths via stoma or mouth/nose (with stoma occluded if Green pathway)'
        ],
        question: 'Are there signs of life and heart rate above 60 bpm?',
        yesLabel: 'Yes — HR > 60 bpm',
        yesId: 'bls-rosc',
        noLabel: 'No — HR < 60 or No Pulse',
        noId: 'bls-compressions'
      },
      {
        id: 'bls-compressions',
        type: 'emergency',
        title: 'Start 15:2 Chest Compressions',
        subtitle: 'Combine high-quality chest compressions with effective airway ventilation.',
        criticalNote: 'Start the 2-Minute CPR Cycle Timer. Verify chest rise regularly.',
        checklist: [
          'Compress lower half of sternum 1/3 chest depth at 100–120/min',
          'Deliver 15 compressions to 2 effective ventilations',
          'Attach pads, establish IV/IO access, and give Adrenaline 10 mcg/kg (0.1 ml/kg of 1:10,000) every 3–5 mins'
        ],
        question: 'Proceed to post-resuscitation care?',
        nextId: 'bls-rosc'
      },
      {
        id: 'bls-rosc',
        type: 'action',
        title: 'Reversible Causes & Post-ROSC Care',
        subtitle: 'Rule out hypoxia, displaced tube, or tension pneumothorax.',
        criticalNote: 'Check the neck for surgical emphysema if forceful ventilation was attempted through a displaced tube.',
        checklist: [
          'Auscultate bilateral axillae and confirm square-wave EtCO2 trace',
          'Titrate inspired oxygen to target SpO2 94–98% once stabilised',
          'Transport with continuous suction and spare tubes at bedside'
        ]
      }
    ]
  },
  {
    id: 'extra-suction-humid',
    title: 'Routine Suctioning & Humidification',
    subtitle: 'Safe assessment, pre-measured suction technique, and secretion management',
    category: 'extra',
    theme: 'amber',
    badge: 'Routine & Secondary Care',
    startNodeId: 'suction-gov',
    references: [
      {
        id: 'ref-gosh-suction',
        title: 'Great Ormond Street Hospital (GOSH): Tracheostomy Suctioning Clinical Guideline',
        source: 'GOSH NHS Foundation Trust',
        url: 'https://www.gosh.nhs.uk/wards-and-departments/departments/clinical-specialties/ear-nose-and-throat-ent-information-parents-and-visitors/living-tracheostomy/'
      },
      {
        id: 'ref-ntsp-care',
        title: 'NTSP Humidification & Suctioning Standards',
        source: 'National Tracheostomy Safety Project',
        url: 'https://www.tracheostomy.org.uk/'
      }
    ],
    nodes: [
      {
        id: 'suction-gov',
        type: 'governance',
        title: 'Check Local Guidance & Bedhead Sign',
        subtitle: 'Verify the child’s tube inner diameter (mm) and pre-measured suction depth (cm).',
        criticalNote: 'Follow local Ambulance Trust guidelines and utilize trained parent/caregiver expertise whenever available.',
        checklist: [
          'Check Bedhead Sign for exact tube size (mm) and suction depth (cm)',
          'Calculate maximum catheter French size: Tube ID (mm) × 2',
          'Set portable suction pressure to 80–100 mmHg (10–13 kPa) for paediatrics'
        ],
        question: 'Does the child have audible secretions, bubbling, or increased work of breathing?',
        yesLabel: 'Yes — Perform Suctioning',
        yesId: 'suction-pass',
        noLabel: 'No — Check Humidification',
        noId: 'humid-check'
      },
      {
        id: 'suction-pass',
        type: 'action',
        title: 'Perform Pre-Measured Tracheal Suction',
        subtitle: 'Insert catheter gently without suction, then apply suction while withdrawing.',
        criticalNote: 'Never advance the catheter beyond the pre-measured depth to avoid carinal trauma and vagal bradycardia.',
        checklist: [
          'Pre-oxygenate if the child is oxygen-dependent or desaturated',
          'Insert flexible catheter to exact pre-measured depth with port uncovered',
          'Occlude suction port and withdraw smoothly using gentle rotation',
          'Limit total suction pass duration to 5–10 seconds maximum'
        ],
        question: 'Did the secretions clear and breathing improve?',
        yesLabel: 'Yes — Airway Clear',
        yesId: 'humid-check',
        noLabel: 'No — Thick Plugging / Resistance',
        noId: 'thick-secretions'
      },
      {
        id: 'thick-secretions',
        type: 'emergency',
        title: 'Manage Thick Secretions or Partial Blockage',
        subtitle: 'Address tenacious mucus plugging before complete tube occlusion occurs.',
        criticalNote: 'Do not flush large volumes of saline down a tracheostomy tube. If catheter cannot pass, switch to the Emergency Pathway.',
        checklist: [
          'Apply nebulised 0.9% Sodium Chloride via tracheostomy mask to loosen plugs',
          'Attempt repeat suction pass with a fresh catheter',
          'If catheter meets complete obstruction, escalate immediately to Emergency Tube Removal'
        ],
        question: 'Has airway patency been restored?',
        nextId: 'humid-check'
      },
      {
        id: 'humid-check',
        type: 'action',
        title: 'Ensure Humidification & Safe Transport',
        subtitle: 'Tracheostomy tubes bypass the nose and mouth, requiring continuous humidification.',
        criticalNote: 'Inspect HME filters frequently during ambulance transfer—if wet or clogged with sputum, replace immediately.',
        checklist: [
          'Fit a clean Heat & Moisture Exchanger (HME / Swedish nose) if self-ventilating on air',
          'Use humidified oxygen or nebuliser mask if administering supplemental oxygen',
          'Keep spare tubes and portable suction unit within immediate reach in transit'
        ]
      }
    ]
  },
  {
    id: 'extra-post-decannulation',
    title: 'Post-Decannulation Monitoring & Transport',
    subtitle: 'Care of a child after accidental decannulation or recent tube removal',
    category: 'extra',
    theme: 'slate',
    badge: 'Post-Removal Care',
    startNodeId: 'decann-gov',
    references: [
      {
        id: 'ref-ntsp-decann',
        title: 'NTSP Post-Decannulation Monitoring & Red Flags',
        source: 'National Tracheostomy Safety Project',
        url: 'https://www.tracheostomy.org.uk/'
      }
    ],
    nodes: [
      {
        id: 'decann-gov',
        type: 'governance',
        title: 'Check Local Guidance & Bedhead Sign',
        subtitle: 'Verify the underlying reason for the tracheostomy and upper airway status.',
        criticalNote: 'If the child shows severe stridor, cyanosis, or apnoea, switch immediately to the NTSP Emergency Pathway.',
        checklist: [
          'Check local Trust guidelines and review the child’s Bedhead Sign',
          'Confirm whether decannulation was recent/planned or accidental',
          'Ensure the Emergency Tracheostomy Go-Bag is open beside the patient'
        ],
        question: 'Is the child maintaining SpO2 and breathing comfortably without a tube?',
        yesLabel: 'Yes — Stable Effort',
        yesId: 'stoma-care',
        noLabel: 'No — Rising Respiratory Distress',
        noId: 'consider-reinsertion'
      },
      {
        id: 'consider-reinsertion',
        type: 'emergency',
        title: 'Support Airway & Consider Tube Replacement',
        subtitle: 'Tracheal stomas can narrow rapidly within minutes to hours of tube displacement.',
        criticalNote: 'If replacing the tube, try the same size first, then the 0.5 mm smaller downsize tube with water-soluble lubricant.',
        checklist: [
          'Apply dual-site high-flow oxygen to both mouth/nose and neck stoma',
          'If trained (or trained caregiver present), attempt gentle re-insertion of spare tube',
          'If unable to re-insert, prepare to ventilate via upper airway (stoma occluded) or neonatal mask on stoma'
        ],
        question: 'Proceed to ongoing monitoring and transfer?',
        nextId: 'stoma-care'
      },
      {
        id: 'stoma-care',
        type: 'action',
        title: 'Stoma Dressing & Hospital Pre-Alert',
        subtitle: 'Monitor closely for delayed upper airway fatigue or stoma granulation bleeding.',
        criticalNote: 'Instruct the child or caregiver to gently press a sterile dressing over the stoma when coughing or speaking.',
        checklist: [
          'Wipe secretions from around the neck stoma with sterile gauze',
          'Monitor continuous SpO2, respiratory rate, work of breathing, and heart rate',
          'Convey to a hospital with Paediatric ENT capability and bring all home tracheostomy equipment'
        ]
      }
    ]
  }
];

const INITIAL_LEARNING_MODULES = [
  {
    id: 'mod-anatomy',
    title: 'Anatomy: Tracheostomy vs. Laryngectomy',
    duration: '6 min read',
    category: 'Airway Fundamentals',
    targetAudience: 'ENT Trainees, Anaesthetists, Paediatricians, ED Clinicians & Paramedics',
    facultyName: 'Paediatric Airway & Pre-Hospital Education Group',
    facultyCredentials: 'Consultant Paediatric ENT & Specialist Pre-Hospital Faculty',
    peerReviewedDate: '2026-02-18',
    coiDisclosure: 'None declared — independent educational resource with zero commercial sponsorship.',
    references: [
      {
        title: 'NTSP Paediatric Tracheostomy Emergency Algorithm (Green & Red)',
        url: 'https://www.tracheostomy.org.uk/healthcare-staff/emergency-care/paediatric-emergency-algorithms'
      },
      {
        title: 'Resuscitation Council UK: Paediatric Basic Life Support Guidelines',
        url: 'https://www.resus.org.uk/library/2021-resuscitation-guidelines/paediatric-basic-life-support-guidelines'
      }
    ],
    summary: 'Understand the anatomical difference between a patent upper airway (Green) and a neck-only airway (Red).',
    learningObjectives: [
      'Differentiate between an anatomical tracheostomy (Green Pathway) and a laryngectomy / isolated neck stoma (Red Pathway).',
      'Select the appropriate oxygenation and positive-pressure ventilation route based on the patient’s NTSP Bedhead Sign.',
      'Demonstrate safe neutral head positioning and stoma occlusion technique during upper-airway BVM ventilation.'
    ],
    sections: [
      {
        id: 'sec-anat-1',
        heading: 'Why NTSP Colour Coding Matters on Scene',
        layout: 'media-right',
        body: `In a paediatric tracheostomy emergency, your critical first question is: **"Can this child be oxygenated and ventilated via the mouth and nose if the tracheostomy tube is blocked or removed?"**\n\n- **Green Bedhead Sign:** Upper airway is potentially patent (larynx remains present above the stoma).\n- **Red Bedhead Sign:** Complete laryngectomy or isolated neck-only stoma with no upper airway connection.\n- **Action on Arrival:** Locate the child's Bedhead Sign or Emergency Go-Bag card within the first 15 seconds.`,
        calloutType: 'pearl',
        pearl: 'Always check the colour of the child’s NTSP Bedhead Sign or caregiver emergency sheet inside their Go-Bag on arrival.',
        comparisonTable: [
          { label: 'Upper Airway Route', value: 'Green: Potentially Patent • Red: Absent / Disconnected' },
          { label: 'Initial Oxygen Site', value: 'Green: Dual-Site (Face + Neck) • Red: Neck Stoma Only' },
          { label: 'Stoma Occlusion for Oral BVM', value: 'Green: Yes (with gauze) • Red: NEVER occlude stoma' }
        ],
        flashcard: {
          front: 'Quick Recall: What does a RED NTSP Bedhead Sign mean for oral BVM ventilation?',
          back: 'NEVER attempt oral BVM or occlude the neck stoma. The patient has a laryngectomy or isolated neck-only airway — oxygenate and ventilate via the neck stoma ONLY.'
        },
        images: [
          {
            id: 'img-anat-1',
            title: 'NTSP Bedhead Colour Identification',
            caption: 'Green indicates a potentially patent upper airway; Red indicates a laryngectomy or isolated neck-only stoma.',
            url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=900&q=80'
          }
        ],
        videos: [
          {
            id: 'vid-anat-1',
            title: 'Visual Guide: Dual Airway vs. Stoma-Only Airway',
            duration: '03:45',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            description: 'Animated sagittal comparison showing airflow pathways in standard tracheostomy versus complete upper airway disconnection.',
            transcript: '00:00 Identify NTSP Bedhead Sign colour • 01:15 Green pathway dual-site oxygen (face + neck) • 02:30 Red pathway neck-only stoma oxygenation without stoma occlusion.'
          }
        ]
      },
      {
        id: 'sec-anat-2',
        heading: 'Green Pathway: Tracheostomy (Upper Airway Connected)',
        layout: 'media-left',
        body: `In almost all children with a tracheostomy, the larynx remains present above the stoma. Even if the child has subglottic stenosis or tracheomalacia, oxygen can usually pass from the mouth and nose into the lungs once a blocked tube is removed.\n\n1. Remove any speaking valve, cap, or HME filter immediately.\n2. Apply high-flow oxygen to both the mouth/nose and the tracheostomy.\n3. If the tube is removed and you ventilate via a face mask, **gently occlude the open neck stoma with sterile gauze** so positive-pressure air does not escape out of the neck.`,
        calloutType: 'warning',
        pearl: 'Avoid hyperextending an infant’s neck—keep the head in neutral alignment with a thin shoulder roll so the soft cartilage does not kink.',
        miniCase: {
          scenario: 'Bedside Scenario: You remove a blocked 3.5 mm tube from a 10-month-old on the Green Pathway. A spare tube will not pass, so you begin oral BVM ventilation, but the chest fails to rise and air hisses from the neck.',
          options: [
            'Hyperextend the infant’s neck further to open the trachea',
            'Firmly occlude the open neck stoma with sterile gauze while ventilating via the face mask',
            'Insert a rigid Yankauer sucker into the stoma'
          ],
          correctIndex: 1,
          feedback: 'Correct! In a Green Pathway child, positive-pressure breaths delivered via the mouth/nose will escape out of an open neck stoma unless occluded with sterile gauze.'
        },
        images: [
          {
            id: 'img-anat-2',
            title: 'Dual-Site Oxygen Delivery & Stoma Occlusion',
            caption: 'Apply oxygen to both face and neck during assessment. Occlude the stoma with gauze when delivering oral BVM breaths.',
            url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=900&q=80'
          }
        ],
        videos: []
      },
      {
        id: 'sec-anat-3',
        heading: 'Red Pathway: Laryngectomy or Complete Obstruction',
        layout: 'stacked',
        body: `When there is no anatomical connection between the pharynx and the trachea (or complete Grade 4 subglottic obliteration), the neck stoma is the child’s **ONLY airway**.\n\n- **Never cover or occlude the stoma** with gauze.\n- **Do not attempt oral BVM ventilation** or oral intubation unless explicitly directed by the child’s specialist care plan.\n- To ventilate an open stoma directly when a tube cannot be replaced, seal a **circular neonatal face mask** or paediatric i-gel over the neck stoma.`,
        calloutType: 'pearl',
        pearl: 'Keep a circular neonatal silicone face mask (size 0 or 1) easily accessible in your paediatric airway pouch for direct stoma ventilation.',
        images: [],
        videos: [
          {
            id: 'vid-anat-2',
            title: 'Ventilating an Open Neck Stoma with a Neonatal Mask',
            duration: '02:20',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            description: 'Demonstration of achieving an airtight seal over a paediatric neck stoma using a circular neonatal silicone mask.',
            transcript: '00:00 Position circular neonatal mask over stoma • 01:05 Maintain neutral neck alignment • 01:45 Verify chest rise and waveform EtCO2.'
          }
        ]
      }
    ],
    quiz: [
      {
        q: 'In a Green Pathway patient whose blocked tracheostomy tube has been removed, how do you perform oral BVM ventilation?',
        options: [
          'Leave the neck stoma open to the air',
          'Occlude the neck stoma gently with sterile gauze so air does not leak out of the neck',
          'Oral ventilation is never possible in a Green Pathway patient'
        ],
        correct: 1,
        explanation: 'Covering the open stoma with sterile gauze prevents positive-pressure breaths delivered via the mouth/nose from escaping out of the neck.'
      },
      {
        q: 'What does a Red Bedhead Sign indicate to attending paramedics?',
        options: [
          'Oxygenate and ventilate via the neck stoma ONLY — no upper airway route exists',
          'The tracheostomy cuff is filled with sterile water',
          'The child only requires nasal cannula oxygen'
        ],
        correct: 0,
        explanation: 'A Red pathway indicates no functional connection between the mouth/nose and lungs; all oxygenation must occur via the neck.'
      },
      {
        q: 'Why should you avoid hyperextending an infant’s neck during airway opening?',
        options: [
          'It loosens the Velcro neck ties',
          'The infant trachea is soft and cartilaginous, and hyperextension can kink or collapse the airway',
          'It prevents capnography from reading accurately'
        ],
        correct: 1,
        explanation: 'Maintain neutral head alignment with a small roll under the shoulders to keep the soft paediatric trachea open.'
      }
    ]
  },
  {
    id: 'mod-bedhead',
    title: 'Reading the NTSP Bedhead Sign & Tubes',
    duration: '7 min read',
    category: 'Equipment & Preparation',
    targetAudience: 'ENT Trainees, Anaesthetists, Paediatricians, ED Clinicians & Paramedics',
    facultyName: 'Paediatric Airway & Pre-Hospital Education Group',
    facultyCredentials: 'Consultant Paediatric ENT & Specialist Pre-Hospital Faculty',
    peerReviewedDate: '2026-02-18',
    coiDisclosure: 'None declared — independent educational resource with zero commercial sponsorship.',
    references: [
      {
        title: 'National Tracheostomy Safety Project: Paediatric Bedhead Signs',
        url: 'https://www.tracheostomy.org.uk/healthcare-staff/emergency-care/paediatric-emergency-algorithms'
      }
    ],
    summary: 'Learn how to quickly read the bedside emergency card, identify single-lumen paediatric tubes, and remove speaking valves.',
    learningObjectives: [
      'Extract tube inner diameter (mm), suction catheter French size, and safe suction depth (cm) from an NTSP Bedhead Sign.',
      'Explain why small paediatric tracheostomy tubes (2.5–5.0 mm) are single-lumen without removable inner cannulae.',
      'Identify and safely remove speaking valves, HME filters, and sterile-water cuffs prior to emergency tube removal.'
    ],
    sections: [
      {
        id: 'sec-bed-1',
        heading: '3 Key Numbers on the Bedhead Sign',
        body: `When arriving at the bedside, look immediately for three critical figures on the child’s emergency sheet:\n\n1. **Tube Inner Diameter (ID in mm):** e.g. 4.0 mm (determines suction catheter & spare tube size).\n2. **Suction Catheter Size & Depth:** e.g. 8 Fr catheter to 8.0 cm pre-measured depth.\n3. **Upper Airway Status:** Documents vocal cord patency or subglottic narrowing.`,
        calloutType: 'pearl',
        pearl: 'A child’s Emergency Tracheostomy Go-Bag travels everywhere with them and holds a copy of their Bedhead Sign plus spare tubes.',
        images: [
          {
            id: 'img-bed-1',
            title: 'Paediatric Emergency Tracheostomy Go-Bag',
            caption: 'Contains same-size spare tube, 0.5 mm smaller downsize tube, suction catheters, blunt scissors, and emergency card.',
            url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=900&q=80'
          }
        ],
        videos: []
      },
      {
        id: 'sec-bed-2',
        heading: 'Single-Lumen Paediatric Tubes & Speaking Valves',
        body: `Unlike adult tracheostomy tubes, neonatal and small paediatric tubes (**2.5 mm to 5.0 mm ID**) are almost always **single-lumen tubes without an inner cannula**.\n\n- **Strip All Attachments First:** Many children wear a colourful one-way speaking valve (e.g. Passy-Muir) or an HME filter on the 15 mm hub.\n- **Eliminate Hidden Obstruction:** In any respiratory distress, twist off all attachments down to the bare white 15 mm tracheostomy hub immediately.\n- **Check for Sterile Water Cuffs:** Silicone Bivona TTS cuffs are often inflated with sterile water rather than air—aspirate completely with a syringe before removing a blocked tube.`,
        calloutType: 'warning',
        pearl: 'A speaking valve is a one-way valve—it lets air in but blocks exhalation through the tube. If the upper airway swells, severe air trapping occurs unless removed.',
        flashcard: {
          front: 'Quick Recall: Why must a Passy-Muir speaking valve be twisted off immediately in respiratory distress?',
          back: 'It is a one-way inspiratory valve. If the child’s upper airway narrows or swells, air enters through the valve but cannot escape, causing rapid air trapping and barotrauma.'
        },
        miniCase: {
          scenario: 'Bedside Scenario: You are called to a 2-year-old with a 4.0 mm Bivona TTS tracheostomy tube who is cyanosed. A suction catheter will not pass, and you notice a small pilot balloon hanging from the flange.',
          options: [
            'Pull the tube out immediately without touching the pilot balloon',
            'Aspirate the pilot balloon completely with a syringe to deflate the sterile-water cuff, reassess, and prepare to remove the tube',
            'Inject 5 ml of air into the pilot balloon'
          ],
          correctIndex: 1,
          feedback: 'Correct! Bivona TTS cuffs are filled with sterile water. Deflating the cuff may allow immediate airflow around the blocked tube and prevents tracheal trauma during tube removal.'
        },
        images: [
          {
            id: 'img-bed-2',
            title: 'Stripping Speaking Valves & HME Attachments',
            caption: 'Always twist off speaking valves or HME filters first before assessing airflow or passing a suction catheter.',
            url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=80'
          }
        ],
        videos: [
          {
            id: 'vid-bed-1',
            title: 'Equipment Walkthrough: Paediatric Tubes & One-Way Valves',
            duration: '04:30',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            description: 'Hands-on overview of uncuffed Shiley and water-cuffed Bivona TTS paediatric tubes, obturators, and speaking valves.',
            transcript: '00:00 Single-lumen paediatric tube anatomy • 01:50 Sterile-water Bivona TTS cuffs • 03:10 Stripping speaking valves & HMEs.'
          }
        ]
      }
    ],
    quiz: [
      {
        q: 'Why must a speaking valve or HME filter be removed immediately in a distressed tracheostomy patient?',
        options: [
          'Speaking valves are one-way valves and HMEs can plug with secretions, causing severe obstruction',
          'They prevent the suction unit from turning on',
          'They only function when the child is sitting upright'
        ],
        correct: 0,
        explanation: 'Removing all hub attachments immediately eliminates clogged HME filters and one-way expiratory valves.'
      },
      {
        q: 'Do standard 3.5 mm ID paediatric tracheostomy tubes have a removable inner cannula?',
        options: [
          'No — they are single-lumen tubes to maximise internal diameter',
          'Yes — all paediatric tubes contain dual inner cannulae',
          'Only when a speaking valve is attached'
        ],
        correct: 0,
        explanation: 'Small paediatric tubes are single-lumen; if blocked and un-suctionable, the entire tube must be removed.'
      },
      {
        q: 'If a paediatric Bivona TTS tube has a pilot balloon, what might the cuff be inflated with?',
        options: [
          'Sterile water or air (aspirate completely with a syringe to deflate)',
          'Saline mixed with adrenaline',
          'Carbon dioxide'
        ],
        correct: 0,
        explanation: 'Silicone Bivona TTS cuffs are often inflated with sterile water because silicone is gas-permeable; aspirate with a syringe.'
      }
    ]
  },
  {
    id: 'mod-suction',
    title: 'Suctioning & Emergency Tube Change',
    duration: '8 min read',
    category: 'Clinical Skills',
    targetAudience: 'ENT Trainees, Anaesthetists, Paediatricians, ED Clinicians & Paramedics',
    facultyName: 'Paediatric Airway & Pre-Hospital Education Group',
    facultyCredentials: 'Consultant Paediatric ENT & Specialist Pre-Hospital Faculty',
    peerReviewedDate: '2026-02-18',
    coiDisclosure: 'None declared — independent educational resource with zero commercial sponsorship.',
    references: [
      {
        title: 'Great Ormond Street Hospital (GOSH): Tracheostomy Suctioning Clinical Guideline',
        url: 'https://www.gosh.nhs.uk/wards-and-departments/departments/clinical-specialties/ear-nose-and-throat-ent-information-parents-and-visitors/living-tracheostomy/'
      }
    ],
    summary: 'Master the suction catheter sizing rule (ID × 2), safe suction depth, and the two-attempt emergency tube replacement protocol.',
    learningObjectives: [
      'Calculate the correct flexible suction catheter French size using the Tube ID (mm) × 2 rule.',
      'Perform pre-measured tracheal suctioning within the safe 5–10 second time window without carinal trauma.',
      'Execute the two-step emergency tube replacement protocol (same-size tube followed by 0.5 mm downsize) with immediate obturator removal.'
    ],
    sections: [
      {
        id: 'sec-suc-1',
        heading: 'Suction Catheter Sizing: Tube ID (mm) × 2 = French (Fr)',
        body: `Double the tracheostomy tube internal diameter (mm) to find the maximum French catheter size.\n\n- **Formula:** Tube ID (mm) × 2 = Catheter Size (Fr). For example, a 4.0 mm tube requires an **8 Fr** catheter.\n- **Pre-Measured Depth:** Only advance the catheter to the child’s documented safe depth (typically 6 to 11 cm) so you do not traumatise the carina or trigger vagal bradycardia.\n- **Time Limit:** Apply suction only while withdrawing for **5 to 10 seconds** maximum.`,
        calloutType: 'warning',
        pearl: 'Never use a rigid Yankauer sucker inside a tracheostomy tube—only use flexible, centimetre-graduated suction catheters.',
        flashcard: {
          front: 'Quick Recall: What is the formula for sizing a paediatric suction catheter & maximum suction pass time?',
          back: 'Tube Inner Diameter (mm) × 2 = French (Fr) catheter size (e.g., 4.0 mm → 8 Fr). Apply suction on withdrawal only for 5–10 seconds maximum.'
        },
        images: [
          {
            id: 'img-suc-1',
            title: 'Pre-Measured Graduated Suction Catheter',
            caption: 'Match centimetre markings on the catheter to the child’s documented safe suction depth.',
            url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=900&q=80'
          }
        ],
        videos: []
      },
      {
        id: 'sec-suc-2',
        heading: 'The Obturator Rule During Emergency Tube Replacement',
        body: `When inserting a spare tube, the solid plastic obturator sits inside the tube to guide its curved tip smoothly through the stoma.\n\n1. Lubricate the spare tube with water-soluble gel.\n2. Slide into the stoma following a gentle downward curve.\n3. **Remove the obturator immediately** once the flange reaches the neck skin — the child cannot breathe while the obturator is inside.\n4. If the same-size tube will not slide in easily, do not force it—immediately attempt the **0.5 mm smaller downsize tube**.`,
        calloutType: 'pearl',
        pearl: 'Confirm successful tube placement using waveform capnography (EtCO2), bilateral chest rise, and smooth passage of a suction catheter.',
        miniCase: {
          scenario: 'Bedside Scenario: During an emergency tube change, you lubricate the same-size spare tube with the obturator inside and guide it into the stoma, but you meet firm resistance halfway in.',
          options: [
            'Push firmly until the flange sits flush against the skin',
            'Stop immediately, withdraw it, and attempt insertion with the 0.5 mm smaller downsize spare tube',
            'Leave the tube halfway in and attach the BVM over the obturator'
          ],
          correctIndex: 1,
          feedback: 'Correct! Never force a tracheostomy tube into a narrowing stoma (risk of creating a false passage). Switch immediately to the 0.5 mm downsize tube, and always remove the obturator as soon as it enters.'
        },
        images: [],
        videos: [
          {
            id: 'vid-suc-1',
            title: 'Step-by-Step: Safe Suctioning & Obturator Removal',
            duration: '05:50',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            description: 'Real-time simulation of blocked tube removal, stoma insertion using a curved motion, and immediate obturator withdrawal.',
            transcript: '00:00 Prepare same-size and 0.5 mm downsize tubes • 01:40 Curved downward insertion with obturator • 02:15 Immediate obturator withdrawal • 03:30 Waveform EtCO2 confirmation.'
          }
        ]
      }
    ],
    quiz: [
      {
        q: 'A child has a 4.0 mm ID tracheostomy tube. What is the recommended suction catheter size?',
        options: [
          'Size 8 Fr',
          'Size 14 Fr',
          'Rigid Yankauer catheter'
        ],
        correct: 0,
        explanation: 'Double the internal diameter in mm (4.0 × 2 = 8 Fr) so the catheter clears secretions without totally occluding the tube.'
      },
      {
        q: 'What must you do immediately after sliding a replacement tube (with obturator) into the stoma?',
        options: [
          'Leave the obturator inside to keep the tube rigid',
          'Remove the obturator immediately so the lumen is open for breathing and ventilation',
          'Instil 10 ml of water down the tube'
        ],
        correct: 1,
        explanation: 'The obturator completely blocks the lumen; remove it immediately once the tube is seated in the stoma.'
      },
      {
        q: 'What is the maximum recommended duration for a single tracheal suction pass in a child?',
        options: [
          '5 to 10 seconds',
          '30 to 45 seconds',
          '60 seconds'
        ],
        correct: 0,
        explanation: 'Suctioning removes oxygen as well as secretions; limit each pass to 5–10 seconds.'
      }
    ]
  }
];

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
  { id: 'eq-7', label: '10 ml Syringe (if cuffed tube present)' },
  { id: 'eq-8', label: 'Paediatric BVM + Neonatal mask (for direct stoma ventilation)' },
  { id: 'eq-9', label: 'Sterile gauze swabs (to occlude stoma for oral ventilation)' }
];

const INITIAL_TUBE_HARDWARE_GUIDE = [
  {
    id: 'hw-shiley-uncuffed',
    name: 'Shiley Neonatal / Paediatric Uncuffed',
    tag: 'Most Common Paediatric Tube',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    imageUrl: '',
    cuffType: 'Uncuffed (No pilot balloon)',
    innerCannula: 'None (Single-lumen — remove whole tube if blocked)',
    keyVisualCue: 'Rigid white/ivory PVC shaft with soft flexible neck flange and standard 15 mm white hub.',
    emergencyAction: 'If blocked and suction catheter will not pass, cut ties and remove the entire tube immediately.'
  },
  {
    id: 'hw-bivona-tts',
    name: 'Bivona TTS (Tight-to-Shaft) Cuffed',
    tag: 'Sterile-Water Cuff',
    tagColor: 'bg-sky-50 text-sky-700 border-sky-200',
    imageUrl: '',
    cuffType: 'Silicone cuff — inflated with STERILE WATER (not air)',
    innerCannula: 'None (Single-lumen)',
    keyVisualCue: 'Soft wire-reinforced silicone shaft with a clear pilot balloon & white inflation valve.',
    emergencyAction: 'Aspirate pilot balloon completely with an empty syringe BEFORE removing a blocked tube.'
  },
  {
    id: 'hw-bivona-flextend',
    name: 'Bivona FlexTend (Extended Proximal Shaft)',
    tag: 'Infant / Chin-Clearance Tube',
    tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    imageUrl: '',
    cuffType: 'Uncuffed or TTS Sterile-Water Cuff',
    innerCannula: 'None (Single-lumen)',
    keyVisualCue: 'Extra-long flexible extension tubing between the neck flange and the 15 mm BVM hub to keep circuits away from a baby’s chin.',
    emergencyAction: 'Attach BVM directly to the extended 15 mm hub; check the extended limb for kinking under chin folds.'
  },
  {
    id: 'hw-speaking-valve',
    name: 'Passy-Muir / One-Way Speaking Valve',
    tag: 'STRIP FIRST IN DISTRESS',
    tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
    imageUrl: '',
    cuffType: 'Hub Attachment (Fits onto 15 mm connector)',
    innerCannula: 'One-way silicone diaphragm (Air IN only)',
    keyVisualCue: 'Brightly coloured (aqua/purple/clear) low-profile cap attached to the tracheostomy hub.',
    emergencyAction: 'TWIST OFF IMMEDIATELY in any breathing difficulty — it blocks exhalation if upper airway swells.'
  },
  {
    id: 'hw-hme-filter',
    name: 'Swedish Nose / HME Humidifier Filter',
    tag: 'REMOVE IF WET OR CLOGGED',
    tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
    imageUrl: '',
    cuffType: 'Hub Attachment (T-piece or cylindrical foam filter)',
    innerCannula: 'Hygroscopic foam / paper filter element',
    keyVisualCue: 'Lightweight translucent T-shaped or round plastic housing with internal sponge/paper media and oxygen side-port.',
    emergencyAction: 'Remove immediately during emergencies — sputum-soaked HME filters act like a solid cork.'
  }
];

const TROUBLESHOOTING_MATRIX = [
  {
    id: 'ts-high-resistance',
    symptom: 'High BVM Resistance / Catheter Will Not Pass',
    urgency: 'Critical Emergency',
    urgencyColor: 'bg-rose-50 text-rose-700 border-rose-200',
    likelyCauses: [
      'Inspissated mucus plug or blood clot occluding lumen',
      'Tube tip displaced into pre-tracheal false passage or abutting posterior tracheal wall',
      'Blocked HME filter or speaking valve still attached'
    ],
    immediateActions: [
      'Strip all hub attachments (speaking valve / HME) immediately',
      'Deflate cuff (if pilot balloon present) and re-check airflow',
      'Remove blocked/displaced tube immediately & follow NTSP Green/Red algorithm'
    ]
  },
  {
    id: 'ts-surgical-emphysema',
    symptom: 'Neck / Chest Crepitus (Surgical Emphysema)',
    urgency: 'High-Risk Red Flag',
    urgencyColor: 'bg-rose-50 text-rose-700 border-rose-200',
    likelyCauses: [
      'Tube displaced out of trachea into subcutaneous neck tissues',
      'Positive-pressure BVM ventilation delivered through a displaced tube',
      'Posterior tracheal wall injury or pneumothorax'
    ],
    immediateActions: [
      'STOP ventilating through the displaced tube immediately',
      'Remove the displaced tube and ventilate via mouth/nose (stoma occluded if Green) or neonatal mask on stoma',
      'Auscultate both lungs for pneumothorax & urgent A&E/ENT pre-alert'
    ]
  },
  {
    id: 'ts-blood-secretions',
    symptom: 'Blood-Stained Secretions or Fresh Stomal Bleeding',
    urgency: 'Urgent Assessment',
    urgencyColor: 'bg-amber-50 text-amber-800 border-amber-200',
    likelyCauses: [
      'Suction catheter advanced past pre-measured depth causing mucosal/carinal trauma',
      'Inadequate humidification causing dry, friable tracheal mucosa',
      'Rare warning sign: Tracheo-innominate artery fistula (sentinel bleed / pulsating tube)'
    ],
    immediateActions: [
      'Verify suction catheter depth matches Bedhead Sign & reduce suction pressure to 80–100 mmHg',
      'Ensure active humidification or nebulised 0.9% NaCl if dry crusting present',
      'If brisk arterial bleeding: hyperinflate cuff (if present), apply digital pressure at suprasternal notch & blue-light transfer'
    ]
  },
  {
    id: 'ts-cuff-leak',
    symptom: 'Audible Air Leak / Vocalisation with Inflated Cuff',
    urgency: 'Non-Critical Check',
    urgencyColor: 'bg-sky-50 text-sky-800 border-sky-200',
    likelyCauses: [
      'Partial tube displacement upward toward vocal cords',
      'Under-inflated or punctured cuff / water evaporation in Bivona TTS cuff',
      'High peak airway pressures during BVM ventilation'
    ],
    immediateActions: [
      'Check neck flange position & neck tie tension (1-finger slack)',
      'Check pilot balloon volume (use sterile water ONLY for Bivona TTS cuffs)',
      'Verify adequate chest rise and square-wave EtCO2 trace'
    ]
  },
  {
    id: 'ts-granulation',
    symptom: 'Red Fleshy Tissue or Ooze Around Stoma Edge',
    urgency: 'Routine / Minor',
    urgencyColor: 'bg-slate-100 text-slate-700 border-slate-200',
    likelyCauses: [
      'Over-granulation tissue from tube friction or moisture',
      'Local skin irritation under wet neck ties'
    ],
    immediateActions: [
      'Clean stoma gently with sterile 0.9% NaCl gauze and pat dry',
      'Apply clean keyhole dressing (e.g., Metalline / Lyofoam) without obstructing lumen',
      'Flag to community tracheostomy nurse / ENT team for routine silver nitrate or barrier review'
    ]
  }
];

const OFFLINE_CACHE_STORAGE_KEY = 'paedtrach_offline_shift_pack_v1';

// ==========================================
// INITIAL PROCEDURE SIMULATIONS (CICO + EMERGENCY TUBE CHANGE & FALSE PASSAGE)
// ==========================================
const INITIAL_PROCEDURE_SIMULATIONS = [
  {
    id: 'sim-paed-cric',
    title: 'Paediatric Emergency Cricothyroidotomy',
    subtitle: 'Can’t Intubate, Can’t Oxygenate (CICO) — Needle (<8 yrs) & Scalpel-Bougie-Tube',
    badge: 'Interactive Procedure Sim',
    diagramType: 'builtin-neck',
    customDiagramUrl: '',
    supportsAgeSwitch: true,
    disclaimer:
      'Educational anatomical & procedural simulation only. In children under 8–10 years, needle cricothyroidotomy with jet/BVM oxygenation is standard UK/DAS rescue over wide-bore surgical cricothyroidotomy due to the small, compliant cricothyroid membrane.',
    tools: [
      {
        id: 'tool-hands',
        name: 'Laryngeal Handshake',
        short: 'Palpate',
        desc: 'Stabilise larynx with non-dominant thumb & middle finger; palpate cricothyroid membrane with index finger.'
      },
      {
        id: 'tool-marker',
        name: 'Skin Marker / Landmark',
        short: 'Mark CTM',
        desc: 'Identify midline vertical neck axis and horizontal cricothyroid membrane groove below the thyroid cartilage.'
      },
      {
        id: 'tool-chlorhex',
        name: 'Chlorhexidine Prep',
        short: 'Prep Skin',
        desc: 'Rapidly clean anterior neck skin if time permits without delaying rescue oxygenation.'
      },
      {
        id: 'tool-cannula',
        name: '14G / 16G Cannula + Saline',
        short: 'Needle CTM',
        desc: 'Kink-resistant cannula attached to 5 ml syringe partially filled with 0.9% saline; advance caudally at 45°.'
      },
      {
        id: 'tool-scalpel',
        name: 'No. 10 / 20 Scalpel',
        short: 'Scalpel',
        desc: 'Vertical midline skin incision (older child/adolescent) followed by horizontal stab through cricothyroid membrane.'
      },
      {
        id: 'tool-bougie',
        name: 'Paediatric Bougie',
        short: 'Bougie',
        desc: 'Slide coudé-tip bougie gently caudally into the trachea (never force past carina).'
      },
      {
        id: 'tool-tube',
        name: 'Cuffed Tube + EtCO2',
        short: 'Tube & EtCO2',
        desc: 'Railroad lubricated 4.0–5.0 mm cuffed tube over bougie, remove bougie, inflate cuff, and confirm waveform EtCO2.'
      }
    ],
    steps: [
      {
        id: 'cric-1',
        phase: 'Preparation & Positioning',
        title: 'Position Neck & Perform Laryngeal Handshake',
        instruction:
          'Place a small roll under the shoulders to expose the anterior neck, then select Palpate and tap the thyroid cartilage to immobilise the larynx.',
        traineeTip:
          'In infants and young children, the hyoid bone and cricoid cartilage are prominent while the thyroid notch is flat—use the Laryngeal Handshake from top down.',
        basicNote:
          'Exposing the neck and steadying the windpipe prevents lateral slip during emergency airway rescue.',
        requiredTool: 'tool-hands',
        ageGroups: ['all'],
        interactionType: 'hold',
        targetZone: { x: 250, y: 155, r: 44, label: 'Thyroid Cartilage & Larynx' },
        demoHint: 'Select "Palpate", then press and hold on the thyroid cartilage to stabilise the larynx.'
      },
      {
        id: 'cric-2',
        phase: 'Preparation & Positioning',
        title: 'Identify & Mark the Cricothyroid Membrane',
        instruction:
          'Select Mark CTM and draw a vertical midline mark across the cricothyroid membrane (between thyroid cartilage above and cricoid ring below).',
        traineeTip:
          'Avoid straying laterally where the anterior jugular veins and carotid sheaths lie.',
        basicNote:
          'The cricothyroid membrane is a small soft window just below the Adam’s apple.',
        requiredTool: 'tool-marker',
        ageGroups: ['all'],
        interactionType: 'draw',
        dragStart: { x: 250, y: 145 },
        dragEnd: { x: 250, y: 215 },
        targetZone: { x: 250, y: 182, r: 36, label: 'Cricothyroid Membrane' },
        demoHint: 'Draw a continuous line with the Skin Marker down across the cricothyroid groove.'
      },
      {
        id: 'cric-3',
        phase: 'Preparation & Positioning',
        title: 'Scrub & Prep Anterior Neck Field',
        instruction:
          'Select Prep Skin and scrub back-and-forth over the anterior neck to coat the surgical field with antiseptic.',
        traineeTip:
          'In a true CICO arrest, do not wait 30 seconds for drying—proceed immediately to airway puncture/incision once prepped.',
        basicNote:
          'Coating the skin with antiseptic reduces infection risk before entering the airway.',
        requiredTool: 'tool-chlorhex',
        ageGroups: ['all'],
        interactionType: 'paint',
        targetZone: { x: 250, y: 182, r: 52, label: 'Anterior Neck Field' },
        demoHint: 'Brush Prep Skin across the highlighted neck area until coverage reaches 100%.'
      },
      {
        id: 'cric-4',
        phase: 'Paediatric Needle Rescue (< 8 Years)',
        title: '45° Caudal Needle Cricothyroidotomy & Air Aspiration',
        instruction:
          'Select Needle CTM and push the 14G/16G cannula downward along the tracheal axis at 45° until air bubbles freely into the saline syringe.',
        traineeTip:
          'Stop advancing the needle the instant air bubbles freely into the saline syringe to avoid perforating the posterior tracheal wall and oesophagus.',
        basicNote:
          'A narrow cannula is used in young children to safely deliver oxygen without damaging their delicate voice box.',
        requiredTool: 'tool-cannula',
        ageGroups: ['infant', 'child'],
        interactionType: 'advance',
        dragStart: { x: 250, y: 176 },
        dragEnd: { x: 250, y: 245 },
        targetZone: { x: 250, y: 182, r: 36, label: 'CTM Puncture & Caudal Advance' },
        demoHint: 'Press on the cricothyroid membrane and push downward along the airway guide.'
      },
      {
        id: 'cric-4b',
        phase: 'Needle Oxygenation & Verification (< 8 Years)',
        title: 'Stabilise Cannula Hub & Deliver Low-Pressure Oxygenation',
        instruction:
          'Select Tube & EtCO2 and press onto the cannula hub to lock the oxygen adapter and confirm chest rise.',
        traineeTip:
          'Hold the cannula flange continuously against the skin—paediatric cannulae kink easily if released. Allow adequate expiratory time (1:4 I:E ratio) to prevent barotrauma.',
        basicNote:
          'Oxygen is delivered carefully through the narrow cannula while watching the chest rise and fall.',
        requiredTool: 'tool-tube',
        ageGroups: ['infant', 'child'],
        interactionType: 'hold',
        targetZone: { x: 250, y: 182, r: 36, label: 'Cannula Oxygen Connection' },
        demoHint: 'Press and hold Tube & EtCO2 onto the cannula hub to connect oxygen.'
      },
      {
        id: 'cric-5',
        phase: 'Surgical Cricothyroidotomy (Adolescent > 10 Years)',
        title: 'Horizontal Cricothyroid Membrane Incision',
        instruction:
          'Select Scalpel and draw a clean horizontal incision across the lower half of the cricothyroid membrane.',
        traineeTip:
          'Keep the blade directed slightly caudally and hug the superior border of the cricoid cartilage to avoid the superior thyroid vessels.',
        basicNote:
          'A small horizontal opening is made directly into the windpipe membrane.',
        requiredTool: 'tool-scalpel',
        ageGroups: ['adolescent'],
        interactionType: 'draw',
        dragStart: { x: 222, y: 182 },
        dragEnd: { x: 278, y: 182 },
        targetZone: { x: 250, y: 182, r: 34, label: 'Horizontal CTM Incision' },
        demoHint: 'Draw the Scalpel horizontally from left to right across the CTM.'
      },
      {
        id: 'cric-6',
        phase: 'Surgical Cricothyroidotomy (Adolescent > 10 Years)',
        title: 'Advance Paediatric Bougie Caudally',
        instruction:
          'Select Bougie and push it smoothly downward along the tracheal lumen to 8–10 cm.',
        traineeTip:
          'Advance only 8–10 cm to avoid carinal trauma or endobronchial placement; feel for gentle tracheal ring clicks.',
        basicNote:
          'The flexible bougie acts as a smooth guide rail into the lungs.',
        requiredTool: 'tool-bougie',
        ageGroups: ['adolescent'],
        interactionType: 'advance',
        dragStart: { x: 250, y: 182 },
        dragEnd: { x: 250, y: 270 },
        targetZone: { x: 250, y: 185, r: 36, label: 'Advance Bougie Into Trachea' },
        demoHint: 'Press at the CTM incision and slide the Bougie downward into the trachea.'
      },
      {
        id: 'cric-7',
        phase: 'Securing & Verification (Adolescent > 10 Years)',
        title: 'Railroad Tube Over Bougie & Confirm EtCO2',
        instruction:
          'Select Tube & EtCO2 and slide the lubricated cuffed tube downward over the bougie into the trachea.',
        traineeTip:
          'Verify bilateral chest rise, square-wave EtCO2 trace, and secure the flange firmly before moving the patient.',
        basicNote:
          'The breathing tube is slid over the guide rail, connected to oxygen, and checked with a CO2 monitor.',
        requiredTool: 'tool-tube',
        ageGroups: ['adolescent'],
        interactionType: 'advance',
        dragStart: { x: 250, y: 175 },
        dragEnd: { x: 250, y: 255 },
        targetZone: { x: 250, y: 185, r: 38, label: 'Railroad Tube Into Trachea' },
        demoHint: 'Press at the airway opening and push the Tube downward into position.'
      }
    ]
  },
  {
    id: 'sim-trach-change',
    title: 'Emergency Tracheostomy Tube Change & False Passage',
    subtitle: 'Safe removal, curved stoma insertion with obturator, and avoiding pre-tracheal false passages',
    badge: 'Sagittal Stoma Sim',
    diagramType: 'builtin-sagittal',
    customDiagramUrl: '',
    supportsAgeSwitch: false,
    disclaimer:
      'Educational sagittal airway simulation. Never force a tracheostomy tube against resistance; if the same-size tube will not enter the tracheal lumen smoothly, immediately switch to the 0.5 mm smaller downsize tube.',
    tools: [
      {
        id: 'tool-scissors',
        name: 'Blunt Scissors / Tie Release',
        short: 'Cut Ties',
        desc: 'Release Velcro ties or cut cotton tapes safely with round-ended blunt scissors.'
      },
      {
        id: 'tool-suction',
        name: 'Flexible Suction Catheter',
        short: 'Suction Stoma',
        desc: 'Clear pooled secretions at the open stoma before inserting the replacement tube.'
      },
      {
        id: 'tool-spare-tube',
        name: 'Lubricated Spare Tube + Obturator',
        short: 'Insert Tube',
        desc: 'Insert lubricated spare tube with obturator in place using a smooth downward curve into the true tracheal lumen.'
      },
      {
        id: 'tool-obturator',
        name: 'Remove Obturator & Attach EtCO2',
        short: 'Pull Obturator',
        desc: 'Immediately withdraw the solid obturator once the flange sits on the skin and attach BVM + waveform EtCO2.'
      }
    ],
    steps: [
      {
        id: 'tc-1',
        phase: 'Removal of Blocked Tube',
        title: 'Release Neck Ties & Withdraw Blocked Tube',
        instruction:
          'Select Cut Ties and slice across the neck flange ties to free and withdraw the occluded tube.',
        traineeTip:
          'Ensure any cuff (e.g., Bivona TTS sterile water cuff) is fully aspirated with a syringe before withdrawing.',
        basicNote:
          'Removing a blocked tube immediately opens the stoma and allows upper-airway airflow in Green Pathway patients.',
        requiredTool: 'tool-scissors',
        ageGroups: ['all'],
        interactionType: 'draw',
        dragStart: { x: 175, y: 140 },
        dragEnd: { x: 175, y: 192 },
        targetZone: { x: 185, y: 165, r: 42, label: 'Tracheostomy Flange & Ties' },
        demoHint: 'Draw Cut Ties vertically across the neck ties to release the tube.'
      },
      {
        id: 'tc-2',
        phase: 'Stoma Preparation',
        title: 'Suction Open Stoma & Clear Secretions',
        instruction:
          'Select Suction Stoma and sweep across the stoma opening to clear pooled secretions.',
        traineeTip:
          'Notice the pre-tracheal tissue plane anterior to the trachea—inserting too steeply or forcefully creates a dangerous false passage.',
        basicNote:
          'Clearing secretions gives a clean view of the windpipe opening.',
        requiredTool: 'tool-suction',
        ageGroups: ['all'],
        interactionType: 'paint',
        targetZone: { x: 210, y: 165, r: 40, label: 'Open Tracheal Stoma' },
        demoHint: 'Sweep Suction Stoma over the stoma opening until cleared to 100%.'
      },
      {
        id: 'tc-3',
        phase: 'Curved Insertion',
        title: 'Push Spare Tube Downward Into True Tracheal Lumen',
        instruction:
          'Select Insert Tube, start at the anterior stoma, and push the curved tube smoothly downward into the blue tracheal lumen.',
        traineeTip:
          'Enter perpendicular to the neck skin first, then rotate caudally as the tip enters the trachea. If resistance occurs, switch to the 0.5 mm downsize tube.',
        basicNote:
          'Following the natural curve of the windpipe guides the tube safely into place.',
        requiredTool: 'tool-spare-tube',
        ageGroups: ['all'],
        interactionType: 'advance',
        dragStart: { x: 175, y: 164 },
        dragEnd: { x: 265, y: 260 },
        targetZone: { x: 185, y: 165, r: 42, label: 'Push Tube Into Tracheal Lumen' },
        demoHint: 'Press at the stoma opening and push the tube downward along the blue airway curve.'
      },
      {
        id: 'tc-4',
        phase: 'Verification',
        title: 'Withdraw Obturator & Confirm Waveform EtCO2',
        instruction:
          'Select Pull Obturator and pull outward from the tube hub to remove the solid obturator and confirm EtCO2.',
        traineeTip:
          'The child cannot breathe while the obturator remains inside. Confirm placement with EtCO2, chest rise, and easy suction catheter passage.',
        basicNote:
          'Removing the solid guide opens the tube so oxygen can flow into the lungs.',
        requiredTool: 'tool-obturator',
        ageGroups: ['all'],
        interactionType: 'advance',
        dragStart: { x: 195, y: 165 },
        dragEnd: { x: 120, y: 165 },
        targetZone: { x: 195, y: 165, r: 42, label: 'Withdraw Obturator From Hub' },
        demoHint: 'Press at the tube hub and pull outward to the left to remove the obturator.'
      }
    ]
  }
];

const renderSimToolGlyph = (toolId = '', className = 'w-4 h-4') => {
  if (toolId.includes('scalpel')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.2">
        <path d="M4 20L14 10M14 10L19 5L21 7L16 12L14 10Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (toolId.includes('cannula')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.2">
        <path d="M3 21L10 14M10 14L17 7M14 4L20 10M17 7L21 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (toolId.includes('bougie')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.4">
        <path d="M5 19C9 15 13 9 18 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (toolId.includes('tube') || toolId.includes('obturator')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.2">
        <path d="M6 5H12V9H6V5ZM9 9V14C9 17.5 11.5 19.5 16 20" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (toolId.includes('scissors')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.2">
        <circle cx="6" cy="7" r="2.5" />
        <circle cx="6" cy="17" r="2.5" />
        <path d="M8.5 8.5L20 18M8.5 15.5L20 6" strokeLinecap="round" />
      </svg>
    );
  }
  if (toolId.includes('marker')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.2">
        <path d="M4 20L8 19L19 8L16 5L5 16L4 20Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return <Stethoscope className={className} />;
};

// ==========================================
// SLEEK PRECISION TOOL CURSORS FOR SIMULATOR CANVAS
// Tip of every tool sits directly at (0,0) for surgical precision
// ==========================================
const renderSvgCanvasToolCursor = (toolId = '', label = '') => {
  if (toolId.includes('hands')) {
    return (
      <g>
        <path
          d="M 0 0 C 2 0 3 2 3 5 L 3 9 L 5 7 C 7 6 8 8 7 10 L 3 17 C 1 20 -3 21 -6 19 C -9 17 -10 13 -8 9 L -4 2 C -3 0 -1 0 0 0 Z"
          fill="#fde68a"
          stroke="#0f172a"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="0" cy="0" r="2.2" fill="#f59e0b" />
      </g>
    );
  }
  if (toolId.includes('marker')) {
    return (
      <g>
        <polygon points="0,0 5,-3 3,-5" fill="#2563eb" />
        <path
          d="M 3 -5 L 18 -20 L 22 -16 L 7 -1 Z"
          fill="#3b82f6"
          stroke="#0f172a"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M 18 -20 L 21 -23 L 25 -19 L 22 -16 Z" fill="#1e293b" />
        <circle cx="0" cy="0" r="1.8" fill="#1d4ed8" />
      </g>
    );
  }
  if (toolId.includes('chlorhex')) {
    return (
      <g>
        <rect
          x="-4"
          y="-4"
          width="11"
          height="7"
          rx="2.5"
          transform="rotate(-45 0 0)"
          fill="#fb7185"
          stroke="#881337"
          strokeWidth="1.3"
        />
        <line x1="5" y1="-5" x2="18" y2="-18" stroke="#e2e8f0" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    );
  }
  if (toolId.includes('cannula')) {
    return (
      <g>
        <line x1="0" y1="0" x2="9" y2="-9" stroke="#e2e8f0" strokeWidth="1.6" strokeLinecap="round" />
        <rect
          x="8"
          y="-13"
          width="14"
          height="6"
          rx="1.5"
          transform="rotate(-45 12 -12)"
          fill="rgba(56, 189, 248, 0.85)"
          stroke="#0369a1"
          strokeWidth="1.2"
        />
        <line x1="18" y1="-18" x2="24" y2="-24" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
        <circle cx="0" cy="0" r="1.5" fill="#38bdf8" />
      </g>
    );
  }
  if (toolId.includes('scalpel')) {
    return (
      <g>
        <path
          d="M 0 0 L 8 -4 L 6 -8 L 0 0 Z"
          fill="#f8fafc"
          stroke="#0f172a"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M 7 -6 L 21 -20 L 23 -18 L 9 -4 Z"
          fill="#334155"
          stroke="#0f172a"
          strokeWidth="1.1"
        />
        <circle cx="0" cy="0" r="1.5" fill="#f43f5e" />
      </g>
    );
  }
  if (toolId.includes('bougie')) {
    return (
      <g>
        <path
          d="M 0 0 L 3 -4 C 9 -10 15 -16 22 -23"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="0" cy="0" r="1.8" fill="#0284c7" />
      </g>
    );
  }
  if (toolId.includes('scissors')) {
    return (
      <g>
        <line x1="0" y1="-2" x2="14" y2="-11" stroke="#e2e8f0" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="0" y1="2" x2="14" y2="-5" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="17" cy="-13" r="3" fill="none" stroke="#94a3b8" strokeWidth="1.6" />
        <circle cx="17" cy="-4" r="3" fill="none" stroke="#94a3b8" strokeWidth="1.6" />
      </g>
    );
  }
  if (toolId.includes('suction')) {
    return (
      <g>
        <path
          d="M 0 0 Q 8 -6 20 -20"
          fill="none"
          stroke="#34d399"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="0" cy="0" r="2" fill="#10b981" />
      </g>
    );
  }
  return (
    <g>
      <path
        d="M 0 0 C 0 -6 4 -10 11 -11 L 11 -15 L 17 -15 L 17 -7 L 11 -7 L 11 -11"
        fill="none"
        stroke="#34d399"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="0" cy="0" r="2" fill="#10b981" />
      <title>{label}</title>
    </g>
  );
};

const formatTime = (totalSec) => {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const formatWithUnit = (val, unit) => {
  const trimmed = (val || '').trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase().endsWith(unit.toLowerCase())) return trimmed;
  return unit.startsWith('/') ? `${trimmed}${unit}` : `${trimmed} ${unit}`;
};

const COMMON_INTERVENTIONS_OPTIONS = [
  'Speaking valve / HME removed',
  'Tracheal suctioning performed',
  '5 rescue breaths delivered',
  'Blocked / displaced tube removed',
  'Same-size spare tube inserted',
  '0.5 mm downsized tube inserted',
  'BVM ventilation via tube / stoma',
  'Oral BVM ventilation (stoma occluded)'
];

const TRAVELLING_WITH_OPTIONS = [
  'Parent / Caregiver',
  'Emergency Go-Bag',
  'Spare Same & Downsize Tubes',
  'HEMS / Critical Care Crew'
];

const ALS_DRUG_OPTIONS = [
  { id: 'adrenaline', label: 'Adrenaline 10 mcg/kg (0.1 ml/kg of 1:10,000)' },
  { id: 'amiodarone', label: 'Amiodarone 5 mg/kg' },
  { id: 'saline', label: '0.9% Sodium Chloride 10 ml/kg bolus' },
  { id: 'glucose', label: 'Glucose 10% 2 ml/kg' }
];

const INITIAL_FEEDBACK_LOGS = [
  {
    id: 'fb-sample-1',
    moduleTitle: 'All Learning Modules (Overall Curriculum)',
    relevanceRating: 5,
    qualityRating: 5,
    objectivesRating: 5,
    overallRating: 5,
    comments: 'Clear NTSP Green/Red differentiation and concise roadside sizing rules.',
    submittedAt: '2026-02-20'
  }
];

const cleanStepTitle = (rawTitle = '') => {
  return String(rawTitle || '').replace(/^[0-9]+[A-Za-z]?\.\s*/, '').trim();
};

export default function App() {
  const [appMode, setAppMode] = useState('oncall');
  const [onCallSubView, setOnCallSubView] = useState('main');
  const [learningSectionTab, setLearningSectionTab] = useState('modules'); // 'modules' | 'simulator'

  // Ensure crisp 512x512 PNG Apple Touch Icon for iOS/Android Home Screen
  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');
      if (ctx) {
        const g = ctx.createLinearGradient(0, 0, 512, 512);
        g.addColorStop(0, '#10b981');
        g.addColorStop(1, '#0f766e');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 28;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.roundRect(84, 152, 344, 78, 39);
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(202, 88, 108, 64, 14);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(216, 230);
        ctx.quadraticCurveTo(216, 382, 326, 408);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(296, 230);
        ctx.quadraticCurveTo(296, 336, 368, 354);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(144, 191, 14, 0, Math.PI * 2);
        ctx.arc(368, 191, 14, 0, Math.PI * 2);
        ctx.fill();

        const pngDataUrl = c.toDataURL('image/png');
        let appleLink = document.querySelector("link[rel='apple-touch-icon']");
        if (!appleLink) {
          appleLink = document.createElement('link');
          appleLink.rel = 'apple-touch-icon';
          document.head.appendChild(appleLink);
        }
        appleLink.href = pngDataUrl;

        let iconLink = document.querySelector("link[rel='icon']");
        if (!iconLink) {
          iconLink = document.createElement('link');
          iconLink.rel = 'icon';
          document.head.appendChild(iconLink);
        }
        iconLink.type = 'image/png';
        iconLink.href = pngDataUrl;
      }
    } catch (e) {
      // Ignore on non-browser environments
    }
  }, []);

  // ==========================================
  // FIREBASE REAL-TIME CLOUD SYNC STATE
  // ==========================================
  const [fbUser, setFbUser] = useState(null);
  const [cloudStatus, setCloudStatus] = useState('connecting');
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState(null);
  const [lastUpdatedBy, setLastUpdatedBy] = useState('Clinical Lead');

  const [pathways, setPathways] = useState(INITIAL_PATHWAYS);
  const [learningModules, setLearningModules] = useState(INITIAL_LEARNING_MODULES);
  const [tubeHardwareList, setTubeHardwareList] = useState(INITIAL_TUBE_HARDWARE_GUIDE);
  const [procedureSims, setProcedureSims] = useState(INITIAL_PROCEDURE_SIMULATIONS);
  const [adminUsers, setAdminUsers] = useState(INITIAL_ADMIN_USERS);
  const [feedbackLogs, setFeedbackLogs] = useState(INITIAL_FEEDBACK_LOGS);
  const [auditLogs, setAuditLogs] = useState([
    {
      id: 'log-init',
      actor: 'Lead Clinical Editor',
      action: 'Published 2026/27 NTSP & NICE aligned clinical pathways',
      timestamp: '2026-02-18 09:00'
    }
  ]);

  const [currentAdminUser, setCurrentAdminUser] = useState(null);
  const [loginEmailInput, setLoginEmailInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [offlinePackSyncedAt, setOfflinePackSyncedAt] = useState(() => {
    try {
      const raw = localStorage.getItem(OFFLINE_CACHE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.cachedAt || null;
      }
    } catch (e) {
      // ignore
    }
    return null;
  });
  const [offlineSyncToast, setOfflineSyncToast] = useState(false);

  const syncOfflineShiftPack = (
    pwList = pathways,
    modList = learningModules,
    hwList = tubeHardwareList,
    showFeedback = false
  ) => {
    try {
      const nowLabel = new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      localStorage.setItem(
        OFFLINE_CACHE_STORAGE_KEY,
        JSON.stringify({
          cachedAt: nowLabel,
          pathways: pwList,
          learningModules: modList,
          tubeHardwareList: hwList
        })
      );
      setOfflinePackSyncedAt(nowLabel);
      if (showFeedback) {
        setOfflineSyncToast(true);
        setTimeout(() => setOfflineSyncToast(false), 3000);
      }
    } catch (e) {
      // ignore quota errors
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OFFLINE_CACHE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.pathways) && parsed.pathways.length > 0) {
          setPathways(parsed.pathways);
        }
        if (Array.isArray(parsed.learningModules) && parsed.learningModules.length > 0) {
          setLearningModules(parsed.learningModules);
        }
        if (Array.isArray(parsed.tubeHardwareList) && parsed.tubeHardwareList.length > 0) {
          setTubeHardwareList(parsed.tubeHardwareList);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      setCloudStatus('offline');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        } catch (err) {
          setCloudStatus('offline');
        }
        return;
      }

      setFbUser(u);
      if (!u.isAnonymous && u.email) {
        setCurrentAdminUser((prev) => {
          if (prev && prev.email?.toLowerCase() === u.email.toLowerCase()) {
            return prev;
          }
          return {
            id: u.uid,
            name: u.displayName || u.email.split('@')[0],
            email: u.email,
            role: 'Clinical Lead (Super Admin)',
            addedAt: new Date().toISOString().slice(0, 10)
          };
        });
      } else {
        setCurrentAdminUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser || fbUser.isAnonymous || !fbUser.email || cloudStatus !== 'synced') return;
    const matchedProfile = adminUsers.find(
      (adm) => adm.email.toLowerCase() === fbUser.email.toLowerCase()
    );
    if (matchedProfile) {
      setCurrentAdminUser(matchedProfile);
    } else if (adminUsers.length > 0) {
      signOut(auth)
        .then(() => signInAnonymously(auth))
        .catch(() => {});
      setCurrentAdminUser(null);
      setLoginError('Your admin access has been revoked by a Super Admin.');
    }
  }, [fbUser, adminUsers, cloudStatus]);

  useEffect(() => {
    if (!fbUser || !db) return;

    const contentDocRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'paedtrach_cms',
      'live_bundle'
    );

    const unsubscribe = onSnapshot(
      contentDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          try {
            let latestPathways = pathways;
            let latestModules = learningModules;
            let latestHardware = tubeHardwareList;
            if (data.pathwaysJson) {
              latestPathways = JSON.parse(data.pathwaysJson);
              setPathways(latestPathways);
            }
            if (data.tubeHardwareJson) {
              latestHardware = JSON.parse(data.tubeHardwareJson);
              setTubeHardwareList(latestHardware);
            }
            if (data.procedureSimsJson) {
              const parsedSims = JSON.parse(data.procedureSimsJson);
              if (Array.isArray(parsedSims) && parsedSims.length > 0) {
                const hasTrachSim = parsedSims.some((s) => s.id === 'sim-trach-change');
                setProcedureSims(
                  hasTrachSim
                    ? parsedSims
                    : [...parsedSims, INITIAL_PROCEDURE_SIMULATIONS[1]]
                );
              }
            }
            if (data.modulesJson) {
              const cloudMods = JSON.parse(data.modulesJson);
              const mergedMods = cloudMods.map((cm) => {
                const defaultMod = INITIAL_LEARNING_MODULES.find((im) => im.id === cm.id);
                if (!defaultMod) return cm;
                return {
                  ...cm,
                  targetAudience: cm.targetAudience || defaultMod.targetAudience,
                  facultyName: cm.facultyName || defaultMod.facultyName,
                  facultyCredentials:
                    cm.facultyCredentials || defaultMod.facultyCredentials,
                  peerReviewedDate: cm.peerReviewedDate || defaultMod.peerReviewedDate,
                  coiDisclosure: cm.coiDisclosure || defaultMod.coiDisclosure,
                  references:
                    Array.isArray(cm.references) && cm.references.length > 0
                      ? cm.references
                      : defaultMod.references || [],
                  learningObjectives:
                    Array.isArray(cm.learningObjectives) && cm.learningObjectives.length > 0
                      ? cm.learningObjectives
                      : defaultMod.learningObjectives || [],
                  sections: (cm.sections || []).map((cs) => {
                    const defaultSec = defaultMod.sections.find((ds) => ds.id === cs.id);
                    if (!defaultSec) return cs;
                    const hasLists = /(^|\n)\s*([-*•]|\d+[.)])\s+/m.test(cs.body || '');
                    return {
                      ...cs,
                      body: hasLists ? cs.body : defaultSec.body,
                      comparisonTable:
                        cs.comparisonTable && cs.comparisonTable.length > 0
                          ? cs.comparisonTable
                          : defaultSec.comparisonTable || [],
                      flashcard: cs.flashcard || defaultSec.flashcard,
                      miniCase: cs.miniCase || defaultSec.miniCase
                    };
                  })
                };
              });
              latestModules = mergedMods;
              setLearningModules(mergedMods);
            }
            syncOfflineShiftPack(latestPathways, latestModules, latestHardware, false);
            if (data.adminUsersJson) setAdminUsers(JSON.parse(data.adminUsersJson));
            if (data.feedbackLogsJson) setFeedbackLogs(JSON.parse(data.feedbackLogsJson));
            if (data.auditLogsJson) setAuditLogs(JSON.parse(data.auditLogsJson));
            if (data.updatedAt) setLastCloudSyncAt(data.updatedAt);
            if (data.updatedBy) setLastUpdatedBy(data.updatedBy);
            setCloudStatus('synced');
          } catch (parseErr) {
            setCloudStatus('synced');
          }
        } else {
          const seedPayload = {
            pathwaysJson: JSON.stringify(INITIAL_PATHWAYS),
            modulesJson: JSON.stringify(INITIAL_LEARNING_MODULES),
            tubeHardwareJson: JSON.stringify(INITIAL_TUBE_HARDWARE_GUIDE),
            procedureSimsJson: JSON.stringify(INITIAL_PROCEDURE_SIMULATIONS),
            adminUsersJson: JSON.stringify(INITIAL_ADMIN_USERS),
            feedbackLogsJson: JSON.stringify(INITIAL_FEEDBACK_LOGS),
            auditLogsJson: JSON.stringify([
              {
                id: 'log-init',
                actor: 'Lead Clinical Editor',
                action: 'Initialized cloud clinical pathways & learning modules',
                timestamp: new Date().toLocaleString('en-GB')
              }
            ]),
            updatedAt: new Date().toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            updatedBy: 'Lead Clinical Editor'
          };
          setDoc(contentDocRef, seedPayload).catch(() => {});
          setCloudStatus('synced');
        }
      },
      () => {
        setCloudStatus('offline');
      }
    );

    return () => unsubscribe();
  }, [fbUser]);

  const [completedModules, setCompletedModules] = useState([]);

  useEffect(() => {
    if (!fbUser || !db) return;
    const progressDocRef = doc(
      db,
      'artifacts',
      appId,
      'users',
      fbUser.uid,
      'learning_progress',
      'status'
    );
    const unsubProgress = onSnapshot(
      progressDocRef,
      (snap) => {
        if (snap.exists() && Array.isArray(snap.data().completedIds)) {
          setCompletedModules(snap.data().completedIds);
        }
      },
      () => {}
    );
    return () => unsubProgress();
  }, [fbUser]);

  const markModuleCompletedInCloud = async (modId) => {
    const updated = completedModules.includes(modId)
      ? completedModules
      : [...completedModules, modId];
    setCompletedModules(updated);
    if (fbUser && db) {
      const progressDocRef = doc(
        db,
        'artifacts',
        appId,
        'users',
        fbUser.uid,
        'learning_progress',
        'status'
      );
      await setDoc(progressDocRef, { completedIds: updated }).catch(() => {});
    }
  };

  const publishCloudUpdate = async ({
    nextPathways = pathways,
    nextModules = learningModules,
    nextHardware = tubeHardwareList,
    nextSims = procedureSims,
    nextAdmins = adminUsers,
    nextFeedbackLogs = feedbackLogs,
    actionDescription = 'Updated clinical content'
  }) => {
    const actorName = currentAdminUser?.name || 'Admin Editor';
    const timeStr = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const newLog = {
      id: `log-${Date.now()}`,
      actor: actorName,
      action: actionDescription,
      timestamp: new Date().toLocaleString('en-GB')
    };
    const nextLogs = [newLog, ...auditLogs].slice(0, 25);

    setPathways(nextPathways);
    setLearningModules(nextModules);
    setTubeHardwareList(nextHardware);
    setProcedureSims(nextSims);
    setAdminUsers(nextAdmins);
    setFeedbackLogs(nextFeedbackLogs);
    setAuditLogs(nextLogs);
    setLastCloudSyncAt(timeStr);
    setLastUpdatedBy(actorName);
    syncOfflineShiftPack(nextPathways, nextModules, nextHardware, false);

    if (fbUser && db) {
      try {
        const contentDocRef = doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'paedtrach_cms',
          'live_bundle'
        );
        await setDoc(contentDocRef, {
          pathwaysJson: JSON.stringify(nextPathways),
          modulesJson: JSON.stringify(nextModules),
          tubeHardwareJson: JSON.stringify(nextHardware),
          procedureSimsJson: JSON.stringify(nextSims),
          adminUsersJson: JSON.stringify(nextAdmins),
          feedbackLogsJson: JSON.stringify(nextFeedbackLogs),
          auditLogsJson: JSON.stringify(nextLogs),
          updatedAt: timeStr,
          updatedBy: actorName
        });
        setCloudStatus('synced');
      } catch (err) {
        setCloudStatus('offline');
      }
    }
  };

  const [activePathwayId, setActivePathwayId] = useState(null);
  const [pathwayViewMode, setPathwayViewMode] = useState('interactive');
  const [currentNodeId, setCurrentNodeId] = useState('gov-check');
  const [nodeHistory, setNodeHistory] = useState(['gov-check']);
  const [checkedItems, setCheckedItems] = useState({});
  const [flowchartInspectNode, setFlowchartInspectNode] = useState(null);
  const [showPathwayRefs, setShowPathwayRefs] = useState(false);

  // Roadside Tools Modal State ('calculator' | 'checklist' | 'handover' | 'hardware' | 'troubleshoot' | null)
  const [activeToolModal, setActiveToolModal] = useState(null);
  const [selectedTubeIdSize, setSelectedTubeIdSize] = useState('4.0');
  const [selectedTroubleshootId, setSelectedTroubleshootId] = useState('ts-high-resistance');
  const [bagChecked, setBagChecked] = useState({});
  // Interactive Procedure Simulator State (With Live Telemetry Monitor, Age-Filtered Steps & Draggable Tools)
  const [activeSimId, setActiveSimId] = useState('sim-paed-cric');
  const [simViewMode, setSimViewMode] = useState('interactive'); // 'interactive' | 'overview'
  const [simAgeGroup, setSimAgeGroup] = useState('child'); // 'infant' | 'child' | 'adolescent'
  const [simStepIndex, setSimStepIndex] = useState(0);
  const [simCompletedSteps, setSimCompletedSteps] = useState({});
  const [selectedSimTool, setSelectedSimTool] = useState('tool-hands');
  const [draggingTrayTool, setDraggingTrayTool] = useState(null);
  const simCursorOverlayRef = React.useRef(null);
  const simSvgRef = React.useRef(null);
  const simStrokeRef = React.useRef([]);
  const simPaintedRef = React.useRef({});
  const simProgressRef = React.useRef(0);
  const simDragActiveRef = React.useRef(false);
  const simLastFrameRef = React.useRef(0);
  const simLivePolylineRef = React.useRef(null);
  const simLiveAdvanceLineRef = React.useRef(null);
  const simLiveProgressTextRef = React.useRef(null);
  const [showSimLabels, setShowSimLabels] = useState(true);
  const [simShowMeHint, setSimShowMeHint] = useState(false);
  const [simFeedbackBanner, setSimFeedbackBanner] = useState(null);
  const [simDragActive, setSimDragActive] = useState(false);
  const [simDragCurrent, setSimDragCurrent] = useState(null);
  const [simStrokePoints, setSimStrokePoints] = useState([]);
  const [simPaintedCells, setSimPaintedCells] = useState({});
  const [simActionProgress, setSimActionProgress] = useState(0); // 0 to 100 live progress
  const [simDisclaimerAccepted, setSimDisclaimerAccepted] = useState(false);
  const [simDeclarationChecked, setSimDeclarationChecked] = useState(false);

  // Hospital Pre-Alert / SBAR Handover Builder State
  const createEmptyHandoverForm = () => ({
    airwayType: 'Green (Patent Upper Airway)',
    tubeId: '',
    suctionDepth: '',
    childAge: '',
    airwayEvent: '',
    selectedInterventions: [],
    otherIntervention: '',
    obsSpo2: '',
    obsO2: '',
    obsRr: '',
    obsHr: '',
    obsEtco2: '',
    cprPerformed: false,
    cprCycles: '',
    alsDrugs: {},
    travellingWith: [],
    travellingOther: ''
  });

  const [handoverForm, setHandoverForm] = useState(createEmptyHandoverForm);
  const [showHandoverCpr, setShowHandoverCpr] = useState(false);
  const [handoverCopied, setHandoverCopied] = useState(false);

  // Global Instant Search Modal State
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // CPD Certificate Modal State
  const [cpdClinicianName, setCpdClinicianName] = useState('');
  const [cpdRegNumber, setCpdRegNumber] = useState('');
  const [cpdKeyPointsLearned, setCpdKeyPointsLearned] = useState('');
  const [cpdPracticeChange, setCpdPracticeChange] = useState('');
  const [showCpdModal, setShowCpdModal] = useState(false);

  // Separate ENT UK Standardised Course Feedback Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmittedToast, setFeedbackSubmittedToast] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState({
    moduleTitle: 'All Learning Modules (Overall Curriculum)',
    relevanceRating: 5,
    qualityRating: 5,
    objectivesRating: 5,
    overallRating: 5,
    comments: ''
  });

  const openLockedFeedbackModal = (lockedTargetTitle) => {
    setFeedbackSubmittedToast(false);
    setFeedbackDraft({
      moduleTitle: lockedTargetTitle,
      relevanceRating: 5,
      qualityRating: 5,
      objectivesRating: 5,
      overallRating: 5,
      comments: ''
    });
    setShowFeedbackModal(true);
  };

  // CPR Timer, Modals & Learning Module State
  const [showCprTimer, setShowCprTimer] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [showGovernanceModal, setShowGovernanceModal] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState('disclaimer');

  const [activeModuleId, setActiveModuleId] = useState(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [maxReachedSectionIndex, setMaxReachedSectionIndex] = useState(0);
  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const [quizAttemptSeed, setQuizAttemptSeed] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Enhanced E-Learning Comfort & Interactive State
  const [moduleNightMode, setModuleNightMode] = useState(false);
  const [moduleLargeText, setModuleLargeText] = useState(false);
  const [flippedFlashcards, setFlippedFlashcards] = useState({});
  const [miniCaseAnswers, setMiniCaseAnswers] = useState({});
  const [expandedVideoTranscripts, setExpandedVideoTranscripts] = useState({});
  const [showFacultyGovernanceBox, setShowFacultyGovernanceBox] = useState(false);

  // Admin CMS State
  const [adminTab, setAdminTab] = useState('pathways');
  const [cmsNotification, setCmsNotification] = useState(null);
  const [adminPathwayId, setAdminPathwayId] = useState('ntsp-green');
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [showNewPathwayModal, setShowNewPathwayModal] = useState(false);
  const [newPathwayForm, setNewPathwayForm] = useState({
    title: '',
    subtitle: '',
    category: 'extra',
    theme: 'amber',
    badge: 'Routine & Secondary Care'
  });
  const [newNodeForm, setNewNodeForm] = useState({
    type: 'action',
    title: '',
    subtitle: '',
    criticalNote: '',
    checklistText: '',
    question: '',
    yesLabel: 'Yes',
    yesId: '',
    noLabel: 'No',
    noId: '',
    nextId: ''
  });
  const [newRefDraft, setNewRefDraft] = useState({
    title: '',
    source: 'NICE / NTSP Guidance',
    url: ''
  });

  const [adminModuleId, setAdminModuleId] = useState('mod-anatomy');
  const [newObjectiveDraft, setNewObjectiveDraft] = useState('');
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [previewSectionInEditor, setPreviewSectionInEditor] = useState(false);
  const [sectionForm, setSectionForm] = useState({
    heading: '',
    layout: 'stacked',
    body: '',
    calloutType: 'pearl',
    pearl: '',
    comparisonTable: [],
    flashcardFront: '',
    flashcardBack: '',
    miniCaseScenario: '',
    miniCaseOpt0: '',
    miniCaseOpt1: '',
    miniCaseOpt2: '',
    miniCaseCorrect: 0,
    miniCaseFeedback: '',
    images: [],
    videos: []
  });
  const [newTableRowDraft, setNewTableRowDraft] = useState({ label: '', value: '' });
  const [newImageDraft, setNewImageDraft] = useState({ title: '', caption: '', url: '' });
  const [newVideoDraft, setNewVideoDraft] = useState({
    title: '',
    duration: '03:00',
    url: '',
    description: '',
    transcript: ''
  });
  const [uploadingMediaType, setUploadingMediaType] = useState(null);
  const [uploadProgressPct, setUploadProgressPct] = useState(0);
  const [showNewModuleModal, setShowNewModuleModal] = useState(false);
  const [newModuleForm, setNewModuleForm] = useState({
    title: '',
    category: 'Clinical Skills',
    duration: '5 min read',
    summary: ''
  });
  const [newQuizDraft, setNewQuizDraft] = useState({
    q: '',
    opt0: '',
    opt1: '',
    opt2: '',
    correct: 0,
    explanation: ''
  });

  // Tube ID Hardware Admin Editor State
  const [editingHardwareId, setEditingHardwareId] = useState(null);
  const [hardwareForm, setHardwareForm] = useState({
    name: '',
    tag: 'Paediatric Tracheostomy Tube',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    imageUrl: '',
    cuffType: '',
    innerCannula: 'None (Single-lumen)',
    keyVisualCue: '',
    emergencyAction: ''
  });
  const [uploadingHardwarePhoto, setUploadingHardwarePhoto] = useState(false);

  // Admin Procedure Sim Designer State (Add / Edit / Delete Steps, Tools & Diagram Hotspots)
  const [adminSimId, setAdminSimId] = useState('sim-paed-cric');
  const [editingSimStepIdx, setEditingSimStepIdx] = useState(0);
  const [uploadingSimDiagram, setUploadingSimDiagram] = useState(false);
  const [showNewSimModal, setShowNewSimModal] = useState(false);
  const [newSimForm, setNewSimForm] = useState({
    title: '',
    subtitle: '',
    customDiagramUrl: ''
  });

  const [ownProfileForm, setOwnProfileForm] = useState({
    name: '',
    email: '',
    newPassword: ''
  });
  const [newAdminForm, setNewAdminForm] = useState({
    name: '',
    email: '',
    role: 'Content Editor',
    password: ''
  });
  const [customFirebaseJsonInput, setCustomFirebaseJsonInput] = useState('');
  const [importJsonText, setImportJsonText] = useState('');

  const isAdminAuthenticated = Boolean(currentAdminUser);
  const isSuperAdmin = Boolean(
    currentAdminUser &&
      typeof currentAdminUser.role === 'string' &&
      currentAdminUser.role.toLowerCase().includes('super admin')
  );

  const notifyCms = (msg) => {
    setCmsNotification(typeof msg === 'string' ? msg : String(msg));
  };

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowGlobalSearch((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const globalSearchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return { pathways: [], steps: [], modules: [] };

    const matchedPathways = pathways.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q)) ||
        (p.badge && p.badge.toLowerCase().includes(q))
    );

    const matchedSteps = [];
    pathways.forEach((p) => {
      (p.nodes || []).forEach((node) => {
        const inTitle = node.title && node.title.toLowerCase().includes(q);
        const inSub = node.subtitle && node.subtitle.toLowerCase().includes(q);
        const inChecklist = (node.checklist || []).some((c) =>
          c.toLowerCase().includes(q)
        );
        if (inTitle || inSub || inChecklist) {
          matchedSteps.push({ pathway: p, node });
        }
      });
    });

    const matchedModules = learningModules.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.summary && m.summary.toLowerCase().includes(q)) ||
        (m.sections || []).some(
          (s) =>
            (s.heading && s.heading.toLowerCase().includes(q)) ||
            (s.body && s.body.toLowerCase().includes(q))
        )
    );

    return {
      pathways: matchedPathways,
      steps: matchedSteps.slice(0, 8),
      modules: matchedModules
    };
  }, [globalSearchQuery, pathways, learningModules]);

  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    const email = loginEmailInput.trim().toLowerCase();
    const pass = loginPasswordInput;
    if (!email || !pass) return;

    setAuthLoading(true);
    setLoginError('');
    try {
      if (!auth) {
        throw new Error('Firebase Authentication is not configured.');
      }
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const matched = adminUsers.find(
        (u) => u.email.toLowerCase() === email
      );
      if (adminUsers.length > 0 && !matched) {
        await signOut(auth);
        await signInAnonymously(auth).catch(() => {});
        setLoginError('Access denied: This email is not on the active Firestore Admin roster.');
        return;
      }
      setCurrentAdminUser(
        matched || {
          id: cred.user.uid,
          name: cred.user.displayName || email.split('@')[0],
          email,
          role: 'Clinical Lead (Super Admin)',
          addedAt: new Date().toISOString().slice(0, 10)
        }
      );
      setLoginPasswordInput('');
    } catch (err) {
      setLoginError(err?.message || 'Invalid email or password.');
    } finally {
      setAuthLoading(false);
    }
  };

  // ==========================================
  // STREAMLINED ENT UK COURSE FEEDBACK HANDLER
  // ==========================================
  const handleSubmitCourseFeedback = async (e) => {
    e.preventDefault();
    const entry = {
      id: `fb-${Date.now()}`,
      moduleTitle: feedbackDraft.moduleTitle,
      relevanceRating: Number(feedbackDraft.relevanceRating),
      qualityRating: Number(feedbackDraft.qualityRating),
      objectivesRating: Number(feedbackDraft.objectivesRating),
      overallRating: Number(feedbackDraft.overallRating),
      comments: feedbackDraft.comments.trim(),
      submittedAt: new Date().toISOString().slice(0, 10)
    };

    const nextFeedbackLogs = [entry, ...feedbackLogs];
    setFeedbackLogs(nextFeedbackLogs);

    if (fbUser && db) {
      try {
        const contentDocRef = doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'paedtrach_cms',
          'live_bundle'
        );
        await setDoc(
          contentDocRef,
          { feedbackLogsJson: JSON.stringify(nextFeedbackLogs) },
          { merge: true }
        );
      } catch (err) {
        // Fallback saved locally
      }
    }

    setFeedbackSubmittedToast(true);
    setTimeout(() => {
      setShowFeedbackModal(false);
      setFeedbackSubmittedToast(false);
    }, 1500);
  };

  const handleExportFeedbackCsv = () => {
    const headers = [
      'Date',
      'Target Module / Scope',
      'Relevance to Practice (1-5)',
      'Educational Quality (1-5)',
      'Effectiveness Meeting Objectives (1-5)',
      'Overall Satisfaction (1-5)',
      'Suggestions / Training Needs'
    ];
    const rows = feedbackLogs.map((f) => [
      f.submittedAt,
      `"${(f.moduleTitle || '').replace(/"/g, '""')}"`,
      f.relevanceRating,
      f.qualityRating,
      f.objectivesRating || f.overallRating || 5,
      f.overallRating,
      `"${(f.comments || '').replace(/"/g, '""')}"`
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'PaedTraches-ENTUK-Course-Feedback.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notifyCms('Exported Course Feedback Summary CSV');
  };

  const generateCpdCertificateDataUrl = () => {
    if (!activeModule) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1130;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const bgGrad = ctx.createLinearGradient(0, 0, 1600, 1130);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(1, '#f0fdf4');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1600, 1130);

    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 10;
    ctx.strokeRect(44, 44, 1512, 1042);

    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 3;
    ctx.strokeRect(64, 64, 1472, 1002);

    const logoGrad = ctx.createLinearGradient(110, 105, 196, 191);
    logoGrad.addColorStop(0, '#10b981');
    logoGrad.addColorStop(1, '#0f766e');
    ctx.fillStyle = logoGrad;
    ctx.beginPath();
    ctx.roundRect(110, 105, 86, 86, 20);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.roundRect(124, 130, 58, 14, 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(144, 118, 18, 12, 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(147, 144);
    ctx.quadraticCurveTo(147, 172, 167, 177);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(159, 144);
    ctx.quadraticCurveTo(159, 162, 172, 166);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(134, 137, 2.8, 0, Math.PI * 2);
    ctx.arc(172, 137, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PaedTraches', 216, 146);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('PaedTraches.co.uk  •  Paediatric Tracheostomy Clinical Education', 216, 178);

    ctx.fillStyle = '#ecfdf5';
    ctx.beginPath();
    ctx.roundRect(1185, 115, 300, 52, 26);
    ctx.fill();
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 19px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CPD CERTIFICATE', 1335, 148);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(110, 224);
    ctx.lineTo(1490, 224);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('CERTIFICATE OF CONTINUING PROFESSIONAL DEVELOPMENT', 800, 285);

    ctx.fillStyle = '#475569';
    ctx.font = '25px sans-serif';
    ctx.fillText('This certifies that', 800, 342);

    const displayName = cpdClinicianName.trim() || 'Registered Healthcare Clinician';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText(displayName, 800, 412);

    if (cpdRegNumber.trim()) {
      ctx.fillStyle = '#475569';
      ctx.font = '600 23px sans-serif';
      ctx.fillText(`Professional Registration / Pin: ${cpdRegNumber.trim()}`, 800, 455);
    }

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(420, 480);
    ctx.lineTo(1180, 480);
    ctx.stroke();

    const todayFormatted = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    ctx.fillStyle = '#475569';
    ctx.font = '24px sans-serif';
    ctx.fillText('has successfully completed the clinical learning module & 100% mastery assessment', 800, 535);

    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(`“${activeModule.title}”`, 800, 592);

    ctx.fillStyle = '#334155';
    ctx.font = '600 22px sans-serif';
    ctx.fillText(
      `via PaedTraches.co.uk  •  Completed on ${todayFormatted}  (${activeModule.duration})`,
      800,
      638
    );

    const hasReflection =
      cpdKeyPointsLearned.trim() || cpdPracticeChange.trim();

    if (hasReflection) {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(150, 680, 1300, 240, 20);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#059669';
      ctx.font = 'bold 17px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('REFLECTIVE PRACTICE JOURNAL (APPRAISAL EVIDENCE):', 185, 718);

      let cursorY = 755;
      const drawWrappedText = (prefix, content) => {
        if (!content) return;
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(prefix, 185, cursorY);
        cursorY += 26;

        ctx.fillStyle = '#334155';
        ctx.font = '18px sans-serif';
        const words = content.split(' ');
        let line = '';
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          if (ctx.measureText(testLine).width > 1230 && i > 0) {
            ctx.fillText(line.trim(), 185, cursorY);
            line = words[i] + ' ';
            cursorY += 25;
            if (cursorY > 900) break;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), 185, cursorY);
        cursorY += 32;
      };

      drawWrappedText('Key Points Learned:', cpdKeyPointsLearned.trim());
      drawWrappedText('How This Will Change Clinical Practice:', cpdPracticeChange.trim());
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '19px sans-serif';
    ctx.fillText(
      `PaedTraches.co.uk • Paediatric Tracheostomy Reference (${INITIAL_GOVERNANCE_META.version}) • Aligned with NTSP & Resuscitation Council UK`,
      800,
      985
    );
    ctx.fillStyle = '#94a3b8';
    ctx.font = '17px sans-serif';
    ctx.fillText(
      `Certificate ID: PT-${activeModule.id.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      800,
      1020
    );

    return canvas.toDataURL('image/png');
  };

  const handleDownloadCertificateImage = () => {
    const dataUrl = generateCpdCertificateDataUrl();
    if (!dataUrl || !activeModule) return;
    const safeName = (cpdClinicianName.trim() || 'Clinician')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `PaedTraches-CPD-Certificate-${safeName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintCertificatePdf = () => {
    const dataUrl = generateCpdCertificateDataUrl();
    if (!dataUrl) return;
    const printWin = window.open('', '_blank', 'width=1050,height=780');
    if (printWin) {
      printWin.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>PaedTraches.co.uk — CPD Certificate</title>
    <style>
      @page { size: landscape; margin: 10mm; }
      body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
      img { max-width: 100%; max-height: 96vh; object-fit: contain; }
    </style>
  </head>
  <body>
    <img src="${dataUrl}" onload="setTimeout(function(){ window.print(); }, 250);" />
  </body>
</html>`);
      printWin.document.close();
    } else {
      handleDownloadCertificateImage();
    }
  };

  const handleUpdateOwnProfile = async (e) => {
    e.preventDefault();
    if (!currentAdminUser) return;
    if (!ownProfileForm.name.trim()) {
      notifyCms('Please enter your display name.');
      return;
    }

    try {
      if (ownProfileForm.newPassword.trim()) {
        if (ownProfileForm.newPassword.trim().length < 6) {
          notifyCms('Firebase requires new passwords to be at least 6 characters long.');
          return;
        }
        if (auth && auth.currentUser && !auth.currentUser.isAnonymous) {
          await updatePassword(auth.currentUser, ownProfileForm.newPassword.trim());
        }
      }

      const updatedSelf = {
        ...currentAdminUser,
        name: ownProfileForm.name.trim()
      };

      const nextAdmins = adminUsers.map((u) =>
        u.email.toLowerCase() === currentAdminUser.email.toLowerCase()
          ? updatedSelf
          : u
      );

      setCurrentAdminUser(updatedSelf);
      setOwnProfileForm((prev) => ({ ...prev, newPassword: '' }));
      await publishCloudUpdate({
        nextAdmins,
        actionDescription: `${updatedSelf.name} updated their profile${
          ownProfileForm.newPassword.trim() ? ' & password' : ''
        }`
      });
      notifyCms('Your profile and encrypted password have been updated!');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        notifyCms('For security, please sign out and sign back in before changing your password.');
      } else {
        notifyCms(err.message || 'Could not update profile.');
      }
    }
  };

  const handleAdminLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
        await signInAnonymously(auth);
      }
    } catch (e) {
      // Fallback
    }
    setCurrentAdminUser(null);
    setLoginPasswordInput('');
    setLoginError('');
    setAppMode('oncall');
  };

  const handleAddAdminTeamMember = async (e) => {
    e.preventDefault();
    const cleanEmail = newAdminForm.email.trim().toLowerCase();
    if (
      !newAdminForm.name.trim() ||
      !cleanEmail ||
      newAdminForm.password.trim().length < 6
    ) {
      notifyCms('Please provide name, email, and a password of at least 6 characters.');
      return;
    }
    const exists = adminUsers.some((u) => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      notifyCms('An admin user with this email already exists in the team.');
      return;
    }

    setAuthLoading(true);
    try {
      let provisionedUid = `adm-${Date.now()}`;

      if (secondaryAuth) {
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          cleanEmail,
          newAdminForm.password.trim()
        );
        provisionedUid = userCredential.user.uid;
        await signOut(secondaryAuth);
      }

      const createdUser = {
        id: provisionedUid,
        name: newAdminForm.name.trim(),
        email: cleanEmail,
        role: newAdminForm.role,
        addedAt: new Date().toISOString().slice(0, 10)
      };

      if (db) {
        await setDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'admin_team', cleanEmail),
          createdUser
        ).catch(() => {});
      }

      const nextAdmins = [...adminUsers, createdUser];
      await publishCloudUpdate({
        nextAdmins,
        actionDescription: `Provisioned Firebase Auth & Firestore account for ${createdUser.name} (${createdUser.role})`
      });

      setNewAdminForm({
        name: '',
        email: '',
        role: 'Content Editor',
        password: ''
      });
      notifyCms(
        `Created encrypted login & Firestore profile for ${createdUser.name}! They can sign in immediately.`
      );
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        const createdUser = {
          id: `adm-${Date.now()}`,
          name: newAdminForm.name.trim(),
          email: cleanEmail,
          role: newAdminForm.role,
          addedAt: new Date().toISOString().slice(0, 10)
        };
        if (db) {
          await setDoc(
            doc(db, 'artifacts', appId, 'public', 'data', 'admin_team', cleanEmail),
            createdUser
          ).catch(() => {});
        }
        const nextAdmins = [...adminUsers, createdUser];
        await publishCloudUpdate({
          nextAdmins,
          actionDescription: `Linked existing Firebase Auth user ${createdUser.name} to Firestore roster`
        });
        setNewAdminForm({
          name: '',
          email: '',
          role: 'Content Editor',
          password: ''
        });
        notifyCms(
          `Added ${createdUser.name} to Firestore roster (existing Firebase Auth account linked).`
        );
      } else {
        notifyCms(err.message || 'Could not create team member account.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRemoveAdminUser = async (targetId) => {
    if (adminUsers.length <= 1) {
      notifyCms('Cannot remove the last remaining administrator.');
      return;
    }
    const target = adminUsers.find((u) => u.id === targetId);
    if (target && db) {
      await deleteDoc(
        doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'admin_team',
          target.email.toLowerCase()
        )
      ).catch(() => {});
    }
    const nextAdmins = adminUsers.filter((u) => u.id !== targetId);
    await publishCloudUpdate({
      nextAdmins,
      actionDescription: `Removed admin user ${target?.name || targetId} from Firestore database`
    });
    notifyCms(`Removed ${target?.name || 'user'} from Firestore & revoked admin access`);
  };

  const handleDownloadBackupJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      pathways,
      learningModules,
      tubeHardwareList,
      procedureSims,
      adminUsers,
      feedbackLogs
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paedtraches-cloud-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    notifyCms('Downloaded full cloud backup JSON');
  };

  const handleImportBackupJson = (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(importJsonText);
      if (Array.isArray(parsed.pathways) && Array.isArray(parsed.learningModules)) {
        publishCloudUpdate({
          nextPathways: parsed.pathways,
          nextModules: parsed.learningModules,
          nextHardware: Array.isArray(parsed.tubeHardwareList)
            ? parsed.tubeHardwareList
            : tubeHardwareList,
          nextSims: Array.isArray(parsed.procedureSims)
            ? parsed.procedureSims
            : procedureSims,
          nextAdmins: Array.isArray(parsed.adminUsers) ? parsed.adminUsers : adminUsers,
          nextFeedbackLogs: Array.isArray(parsed.feedbackLogs)
            ? parsed.feedbackLogs
            : feedbackLogs,
          actionDescription: 'Restored full content bundle from JSON backup'
        });
        setImportJsonText('');
        notifyCms('Restored content & synced live to Cloud!');
      } else {
        notifyCms('Invalid JSON format: must contain pathways and learningModules arrays.');
      }
    } catch (err) {
      notifyCms('Could not parse JSON. Check syntax and try again.');
    }
  };

  const handleCopyJsonToClipboard = () => {
    const payload = JSON.stringify({ pathways, learningModules }, null, 2);
    const textArea = document.createElement('textarea');
    textArea.value = payload;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      notifyCms('Copied current pathways & modules JSON to clipboard!');
    } catch (err) {
      notifyCms('Unable to copy automatically.');
    }
    document.body.removeChild(textArea);
  };

  const handleSaveCustomFirebaseConfig = (e) => {
    e.preventDefault();
    try {
      if (!customFirebaseJsonInput.trim()) {
        localStorage.removeItem('paedtrach_custom_firebase_config');
        notifyCms('Cleared custom Firebase config. Reload page to apply.');
        return;
      }
      const parsed = JSON.parse(customFirebaseJsonInput);
      if (!parsed.apiKey || !parsed.projectId) {
        notifyCms('Invalid config: must include "apiKey" and "projectId".');
        return;
      }
      localStorage.setItem('paedtrach_custom_firebase_config', JSON.stringify(parsed));
      notifyCms('Saved custom Firebase Cloud config! Reload the page to connect.');
    } catch (err) {
      notifyCms('Please paste valid JSON from your Firebase Project Settings.');
    }
  };

  const handleDownloadStandaloneWebsite = () => {
    const currentDataBundle = {
      pathways,
      learningModules,
      adminUsers,
      exportedAt: new Date().toISOString()
    };

    const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#059669" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="PaedTraches" />
  <title>PaedTraches — Paediatric Tracheostomy Guide</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#F8FAFC] text-[#0F172A] font-sans antialiased">
  <div id="app" class="max-w-7xl mx-auto px-4 py-8"></div>
  <script>
    const BUNDLE = ${JSON.stringify(currentDataBundle, null, 2)};
    const root = document.getElementById('app');
    root.innerHTML = \`
      <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Standalone Export Bundle</span>
            <h1 class="text-2xl font-bold text-slate-900 mt-2">PaedTraches Clinical Bundle</h1>
            <p class="text-sm text-slate-500">Exported \${new Date(BUNDLE.exportedAt).toLocaleString('en-GB')} • \${BUNDLE.pathways.length} Pathways & \${BUNDLE.learningModules.length} Learning Modules included.</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          \${BUNDLE.pathways.map(p => \`
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div class="text-xs font-semibold text-emerald-700">\${p.badge}</div>
              <div class="text-base font-bold text-slate-900">\${p.title}</div>
              <div class="text-xs text-slate-500">\${p.subtitle} (\${p.nodes.length} steps)</div>
            </div>
          \`).join('')}
        </div>
      </div>
    \`;
  </script>
</body>
</html>`;

    const blob = new Blob([standaloneHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
    notifyCms('Downloaded index.html with your current pathways & modules!');
  };

  const coreEmergencyPathways = useMemo(
    () => pathways.filter((p) => p.category !== 'extra'),
    [pathways]
  );
  const extraRoutinePathways = useMemo(
    () => pathways.filter((p) => p.category === 'extra'),
    [pathways]
  );

  const activePathway = useMemo(
    () => pathways.find((p) => p.id === activePathwayId) || pathways[0],
    [pathways, activePathwayId]
  );

  const currentNode = useMemo(
    () =>
      activePathway.nodes.find((n) => n.id === currentNodeId) ||
      activePathway.nodes[0],
    [activePathway, currentNodeId]
  );

  const handleOpenPathway = (pathwayId, specificNodeId = null) => {
    const target = pathways.find((p) => p.id === pathwayId);
    if (!target) return;
    setAppMode('oncall');
    setActivePathwayId(pathwayId);
    const startId = specificNodeId || target.startNodeId || target.nodes[0]?.id;
    setCurrentNodeId(startId);
    setNodeHistory([startId]);
    setPathwayViewMode('interactive');
    setFlowchartInspectNode(null);
    setShowPathwayRefs(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectDecision = (targetNodeId) => {
    if (!targetNodeId) return;
    setCurrentNodeId(targetNodeId);
    setNodeHistory((prev) => [...prev, targetNodeId]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepBack = () => {
    if (nodeHistory.length <= 1) return;
    const updated = nodeHistory.slice(0, -1);
    setNodeHistory(updated);
    setCurrentNodeId(updated[updated.length - 1]);
  };

  const handleRestartPathway = () => {
    const startId = activePathway.startNodeId || activePathway.nodes[0]?.id;
    setCurrentNodeId(startId);
    setNodeHistory([startId]);
    setCheckedItems({});
  };

  const toggleChecklistItem = (nodeId, idx) => {
    const key = `${nodeId}-${idx}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getThemeStyles = (theme) => {
    if (theme === 'green') {
      return {
        topBar: 'border-t-4 border-t-emerald-500',
        pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        cardHover: 'hover:border-emerald-300'
      };
    }
    if (theme === 'red') {
      return {
        topBar: 'border-t-4 border-t-rose-500',
        pill: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        primaryBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
        cardHover: 'hover:border-rose-300'
      };
    }
    if (theme === 'amber') {
      return {
        topBar: 'border-t-4 border-t-amber-500',
        pill: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
        cardHover: 'hover:border-amber-300'
      };
    }
    if (theme === 'slate') {
      return {
        topBar: 'border-t-4 border-t-slate-600',
        pill: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-600',
        primaryBtn: 'bg-slate-800 hover:bg-slate-900 text-white',
        cardHover: 'hover:border-slate-300'
      };
    }
    return {
      topBar: 'border-t-4 border-t-sky-500',
      pill: 'bg-sky-50 text-sky-700 border-sky-200',
      dot: 'bg-sky-500',
      primaryBtn: 'bg-sky-600 hover:bg-sky-700 text-white',
      cardHover: 'hover:border-sky-300'
    };
  };

  // ==========================================
  // ADMIN CMS HANDLERS
  // ==========================================
  const adminPathway = useMemo(
    () => pathways.find((p) => p.id === adminPathwayId) || pathways[0],
    [pathways, adminPathwayId]
  );

  const handleCreateNewPathway = (e) => {
    e.preventDefault();
    if (!newPathwayForm.title.trim()) return;
    const newId =
      'pw-' +
      newPathwayForm.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString().slice(-3);

    const govNodeId = `gov-${Date.now().toString().slice(-4)}`;
    const firstActionId = `step-${Date.now().toString().slice(-4)}`;

    const createdPathway = {
      id: newId,
      title: newPathwayForm.title.trim(),
      subtitle: newPathwayForm.subtitle.trim() || 'Clinical management pathway',
      category: newPathwayForm.category,
      theme: newPathwayForm.theme,
      badge:
        newPathwayForm.badge.trim() ||
        (newPathwayForm.category === 'extra' ? 'Extra Pathway' : 'Emergency Pathway'),
      startNodeId: govNodeId,
      references: [
        {
          id: `ref-${Date.now()}`,
          title: 'NTSP Paediatric Tracheostomy Guidance',
          source: 'National Tracheostomy Safety Project',
          url: 'https://www.tracheostomy.org.uk/'
        }
      ],
      nodes: [
        {
          id: govNodeId,
          type: 'governance',
          title: 'Confirm Local Guidance & Bedhead Sign',
          subtitle: 'Check local Ambulance Trust / JRCALC protocol and identify airway details before starting.',
          criticalNote: 'Always verify the child’s Bedhead Sign or Caregiver Emergency Card for tube size, suction depth, and upper airway status.',
          checklist: [
            'Follow local Ambulance Trust / JRCALC clinical guidance',
            'Check Bedhead Sign for tube size (mm) & pre-measured suction depth (cm)',
            'Ensure the child’s Emergency Tracheostomy Go-Bag is at the bedside'
          ],
          question: 'Ready to proceed to clinical steps?',
          nextId: firstActionId
        },
        {
          id: firstActionId,
          type: 'action',
          title: 'Initial Assessment & Action',
          subtitle: 'Edit this step or add new linked steps in the Pathway Editor.',
          criticalNote: '',
          checklist: [
            'Assess airway, breathing, and circulation',
            'Maintain appropriate humidification and monitoring'
          ]
        }
      ]
    };

    const nextPathways = [...pathways, createdPathway];
    publishCloudUpdate({
      nextPathways,
      actionDescription: `Created pathway "${createdPathway.title}"`
    });
    setAdminPathwayId(newId);
    setShowNewPathwayModal(false);
    setNewPathwayForm({
      title: '',
      subtitle: '',
      category: 'extra',
      theme: 'amber',
      badge: 'Routine & Secondary Care'
    });
    notifyCms(`Created pathway "${createdPathway.title}" & synced to Cloud`);
  };

  const handleDeletePathway = (pathwayId) => {
    if (pathways.length <= 1) return;
    const target = pathways.find((p) => p.id === pathwayId);
    const remaining = pathways.filter((p) => p.id !== pathwayId);
    publishCloudUpdate({
      nextPathways: remaining,
      actionDescription: `Deleted pathway "${target?.title || pathwayId}"`
    });
    if (adminPathwayId === pathwayId) {
      setAdminPathwayId(remaining[0].id);
    }
    notifyCms('Pathway removed & synced to Cloud');
  };

  const handleAddReferenceToPathway = (e) => {
    e.preventDefault();
    if (!newRefDraft.title.trim() || !newRefDraft.url.trim()) return;
    const refObj = {
      id: `ref-${Date.now()}`,
      title: newRefDraft.title.trim(),
      source: newRefDraft.source.trim() || 'Clinical Guideline',
      url: newRefDraft.url.trim()
    };
    const nextPathways = pathways.map((p) =>
      p.id === adminPathway.id
        ? { ...p, references: [...(p.references || []), refObj] }
        : p
    );
    publishCloudUpdate({
      nextPathways,
      actionDescription: `Added guideline link "${refObj.title}" to ${adminPathway.title}`
    });
    setNewRefDraft({ title: '', source: 'NICE / NTSP Guidance', url: '' });
    notifyCms('Added NICE / Guideline reference link');
  };

  const handleDeleteReferenceFromPathway = (refId) => {
    const nextPathways = pathways.map((p) =>
      p.id === adminPathway.id
        ? { ...p, references: (p.references || []).filter((r) => r.id !== refId) }
        : p
    );
    publishCloudUpdate({
      nextPathways,
      actionDescription: `Removed guideline reference from ${adminPathway.title}`
    });
  };

  const loadNodeIntoForm = (node) => {
    setEditingNodeId(node.id);
    setNewNodeForm({
      type: node.type || 'action',
      title: cleanStepTitle(node.title),
      subtitle: node.subtitle || '',
      criticalNote: node.criticalNote || '',
      checklistText: (node.checklist || []).join('\n'),
      question: node.question || '',
      yesLabel: node.yesLabel || 'Yes',
      yesId: node.yesId || '',
      noLabel: node.noLabel || 'No',
      noId: node.noId || '',
      nextId: node.nextId || ''
    });
  };

  const resetAdminForm = () => {
    setEditingNodeId(null);
    setNewNodeForm({
      type: 'action',
      title: '',
      subtitle: '',
      criticalNote: '',
      checklistText: '',
      question: '',
      yesLabel: 'Yes',
      yesId: '',
      noLabel: 'No',
      noId: '',
      nextId: ''
    });
  };

  const handleSaveAdminNode = (e) => {
    e.preventDefault();
    if (!newNodeForm.title.trim()) return;

    const generatedId =
      editingNodeId ||
      newNodeForm.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
        '-' +
        Date.now().toString().slice(-3);

    const checklistArray = newNodeForm.checklistText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const constructedNode = {
      id: generatedId,
      type: newNodeForm.type,
      title: cleanStepTitle(newNodeForm.title),
      subtitle: newNodeForm.subtitle.trim(),
      criticalNote: newNodeForm.criticalNote.trim(),
      checklist: checklistArray,
      question: newNodeForm.question.trim() || undefined,
      yesLabel: newNodeForm.yesId ? newNodeForm.yesLabel : undefined,
      yesId: newNodeForm.yesId || undefined,
      noLabel: newNodeForm.noId ? newNodeForm.noLabel : undefined,
      noId: newNodeForm.noId || undefined,
      nextId: newNodeForm.nextId || undefined
    };

    const nextPathways = pathways.map((p) => {
      if (p.id !== adminPathwayId) return p;
      const exists = p.nodes.some((n) => n.id === editingNodeId);
      const updatedNodes = exists
        ? p.nodes.map((n) => (n.id === editingNodeId ? constructedNode : n))
        : [...p.nodes, constructedNode];
      return { ...p, nodes: updatedNodes };
    });

    publishCloudUpdate({
      nextPathways,
      actionDescription: `Saved step "${constructedNode.title}" in ${adminPathway.title}`
    });
    notifyCms(`Saved step "${constructedNode.title}" & synced to Cloud`);
    resetAdminForm();
  };

  const handleDeleteAdminNode = (nodeId) => {
    if (adminPathway.nodes.length <= 1) return;
    const nextPathways = pathways.map((p) => {
      if (p.id !== adminPathwayId) return p;
      return {
        ...p,
        nodes: p.nodes.filter((n) => n.id !== nodeId)
      };
    });
    publishCloudUpdate({
      nextPathways,
      actionDescription: `Deleted step from ${adminPathway.title}`
    });
    if (editingNodeId === nodeId) resetAdminForm();
  };

  const adminModule = useMemo(
    () => learningModules.find((m) => m.id === adminModuleId) || learningModules[0],
    [learningModules, adminModuleId]
  );

  const resetSectionForm = () => {
    setEditingSectionId(null);
    setSectionForm({
      heading: '',
      layout: 'stacked',
      body: '',
      calloutType: 'pearl',
      pearl: '',
      comparisonTable: [],
      flashcardFront: '',
      flashcardBack: '',
      miniCaseScenario: '',
      miniCaseOpt0: '',
      miniCaseOpt1: '',
      miniCaseOpt2: '',
      miniCaseCorrect: 0,
      miniCaseFeedback: '',
      images: [],
      videos: []
    });
    setNewTableRowDraft({ label: '', value: '' });
    setNewImageDraft({ title: '', caption: '', url: '' });
    setNewVideoDraft({
      title: '',
      duration: '03:00',
      url: '',
      description: '',
      transcript: ''
    });
    setPreviewSectionInEditor(false);
  };

  const loadSectionIntoForm = (sec) => {
    setEditingSectionId(sec.id);
    setSectionForm({
      heading: sec.heading || '',
      layout: sec.layout || 'stacked',
      body: sec.body || '',
      calloutType: sec.calloutType || 'pearl',
      pearl: sec.pearl || '',
      comparisonTable: sec.comparisonTable ? [...sec.comparisonTable] : [],
      flashcardFront: sec.flashcard?.front || '',
      flashcardBack: sec.flashcard?.back || '',
      miniCaseScenario: sec.miniCase?.scenario || '',
      miniCaseOpt0: sec.miniCase?.options?.[0] || '',
      miniCaseOpt1: sec.miniCase?.options?.[1] || '',
      miniCaseOpt2: sec.miniCase?.options?.[2] || '',
      miniCaseCorrect: sec.miniCase?.correctIndex ?? 0,
      miniCaseFeedback: sec.miniCase?.feedback || '',
      images: sec.images ? [...sec.images] : [],
      videos: sec.videos ? [...sec.videos] : []
    });
    setPreviewSectionInEditor(false);
  };

  const insertFormattingToken = (tokenType) => {
    const snippetMap = {
      bullet: '\n- Bullet point item',
      numbered: '\n1. Numbered step item',
      heading: '\n## Subheading Title\n',
      bold: '**bold clinical term**'
    };
    setSectionForm((prev) => ({
      ...prev,
      body: prev.body + (snippetMap[tokenType] || '')
    }));
  };

  const handleAddTableRowToSection = () => {
    if (!newTableRowDraft.label.trim() || !newTableRowDraft.value.trim()) return;
    setSectionForm((prev) => ({
      ...prev,
      comparisonTable: [
        ...(prev.comparisonTable || []),
        { label: newTableRowDraft.label.trim(), value: newTableRowDraft.value.trim() }
      ]
    }));
    setNewTableRowDraft({ label: '', value: '' });
  };

  const handleUploadMediaFile = (file, mediaKind) => {
    if (!file) return;
    if (!storage) {
      notifyCms(
        'Firebase Storage is not connected. Paste an image/video URL instead or connect Firebase.'
      );
      return;
    }

    const maxBytes = mediaKind === 'video' ? 80 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      notifyCms(
        mediaKind === 'video'
          ? 'Video exceeds 80 MB limit. Compress the clip or use a YouTube/Vimeo link.'
          : 'Image exceeds 15 MB limit.'
      );
      return;
    }

    setUploadingMediaType(mediaKind);
    setUploadProgressPct(0);

    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const fileRef = storageRef(
      storage,
      `artifacts/${appId}/public/media/${mediaKind}s/${safeFileName}`
    );

    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setUploadProgressPct(pct);
      },
      (err) => {
        setUploadingMediaType(null);
        notifyCms(
          err.message ||
            'Upload failed. Check that Firebase Storage is enabled in your Firebase Console.'
        );
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        if (mediaKind === 'image') {
          setSectionForm((prev) => ({
            ...prev,
            images: [
              ...prev.images,
              {
                id: `img-${Date.now()}`,
                title: newImageDraft.title.trim() || cleanTitle,
                caption: newImageDraft.caption.trim() || '',
                url: downloadUrl
              }
            ]
          }));
          setNewImageDraft({ title: '', caption: '', url: '' });
          notifyCms('Photo uploaded to Cloud Storage & attached to section!');
        } else {
          setSectionForm((prev) => ({
            ...prev,
            videos: [
              ...prev.videos,
              {
                id: `vid-${Date.now()}`,
                title: newVideoDraft.title.trim() || cleanTitle,
                duration: newVideoDraft.duration.trim() || 'Video Clip',
                url: downloadUrl,
                description:
                  newVideoDraft.description.trim() || 'Uploaded clinical training video.',
                transcript: newVideoDraft.transcript.trim() || ''
              }
            ]
          }));
          setNewVideoDraft({
            title: '',
            duration: '03:00',
            url: '',
            description: '',
            transcript: ''
          });
          notifyCms('Video uploaded to Cloud Storage & attached to section!');
        }
        setUploadingMediaType(null);
        setUploadProgressPct(0);
      }
    );
  };

  const handleCreateNewModule = (e) => {
    e.preventDefault();
    if (!newModuleForm.title.trim()) return;
    const newModId =
      'mod-' +
      newModuleForm.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString().slice(-3);

    const createdModule = {
      id: newModId,
      title: newModuleForm.title.trim(),
      category: newModuleForm.category.trim() || 'Clinical Skills',
      duration: newModuleForm.duration.trim() || '5 min read',
      targetAudience: 'ENT Trainees, Anaesthetists, Paediatricians, ED Clinicians & Paramedics',
      facultyName: currentAdminUser?.name || 'Paediatric Airway & Pre-Hospital Education Group',
      facultyCredentials: 'Consultant Paediatric ENT & Specialist Pre-Hospital Faculty',
      peerReviewedDate: new Date().toISOString().slice(0, 10),
      coiDisclosure: 'None declared — independent educational resource.',
      references: [],
      summary: newModuleForm.summary.trim() || 'Educational module for paediatric tracheostomy care.',
      learningObjectives: [
        'Identify key clinical signs and airway priorities in this scenario.',
        'Apply safe, evidence-based paediatric tracheostomy management aligned with NTSP standards.'
      ],
      sections: [
        {
          id: `sec-${Date.now()}`,
          heading: 'Introduction & Key Concepts',
          layout: 'stacked',
          body: 'Add your formatted clinical content, bullet points, tables, photos, and videos to this section using the editor.',
          calloutType: 'pearl',
          pearl: 'Always check the patient’s Bedhead Sign and follow local Trust guidelines.',
          comparisonTable: [],
          images: [],
          videos: []
        }
      ],
      quiz: []
    };

    const nextModules = [...learningModules, createdModule];
    publishCloudUpdate({
      nextModules,
      actionDescription: `Created learning module "${createdModule.title}"`
    });
    setAdminModuleId(newModId);
    setShowNewModuleModal(false);
    setNewModuleForm({
      title: '',
      category: 'Clinical Skills',
      duration: '5 min read',
      summary: ''
    });
    resetSectionForm();
    notifyCms(`Created learning module "${createdModule.title}" & synced to Cloud`);
  };

  const handleDeleteModule = (modId) => {
    if (learningModules.length <= 1) return;
    const target = learningModules.find((m) => m.id === modId);
    const remaining = learningModules.filter((m) => m.id !== modId);
    publishCloudUpdate({
      nextModules: remaining,
      actionDescription: `Removed learning module "${target?.title || modId}"`
    });
    if (adminModuleId === modId) {
      setAdminModuleId(remaining[0].id);
    }
    notifyCms('Learning module removed & synced to Cloud');
  };

  const handleUpdateModuleMeta = (field, value) => {
    const nextModules = learningModules.map((m) =>
      m.id === adminModule.id ? { ...m, [field]: value } : m
    );
    publishCloudUpdate({
      nextModules,
      actionDescription: `Updated module metadata for "${adminModule.title}"`
    });
  };

  const handleAddModuleObjective = () => {
    if (!newObjectiveDraft.trim()) return;
    const updatedObjectives = [
      ...(adminModule.learningObjectives || []),
      newObjectiveDraft.trim()
    ];
    handleUpdateModuleMeta('learningObjectives', updatedObjectives);
    setNewObjectiveDraft('');
    notifyCms('Added Learning Objective');
  };

  const handleDeleteModuleObjective = (objIndex) => {
    const updatedObjectives = (adminModule.learningObjectives || []).filter(
      (_, i) => i !== objIndex
    );
    handleUpdateModuleMeta('learningObjectives', updatedObjectives);
  };

  const handleAddImageToSectionForm = () => {
    if (!newImageDraft.title.trim() && !newImageDraft.url.trim()) return;
    const imgItem = {
      id: `img-${Date.now()}`,
      title: newImageDraft.title.trim() || 'Clinical Diagram / Photo',
      caption: newImageDraft.caption.trim() || '',
      url:
        newImageDraft.url.trim() ||
        'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=900&q=80'
    };
    setSectionForm((prev) => ({
      ...prev,
      images: [...prev.images, imgItem]
    }));
    setNewImageDraft({ title: '', caption: '', url: '' });
  };

  const handleAddVideoToSectionForm = () => {
    if (!newVideoDraft.title.trim()) return;
    const vidItem = {
      id: `vid-${Date.now()}`,
      title: newVideoDraft.title.trim(),
      duration: newVideoDraft.duration.trim() || '03:00',
      url: newVideoDraft.url.trim() || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      description: newVideoDraft.description.trim() || 'Clinical training video walkthrough.',
      transcript: newVideoDraft.transcript.trim() || ''
    };
    setSectionForm((prev) => ({
      ...prev,
      videos: [...prev.videos, vidItem]
    }));
    setNewVideoDraft({
      title: '',
      duration: '03:00',
      url: '',
      description: '',
      transcript: ''
    });
  };

  const handleSaveSection = (e) => {
    e.preventDefault();
    if (!sectionForm.heading.trim()) return;

    const hasFlashcard =
      sectionForm.flashcardFront.trim() && sectionForm.flashcardBack.trim();
    const miniCaseOpts = [
      sectionForm.miniCaseOpt0.trim(),
      sectionForm.miniCaseOpt1.trim(),
      sectionForm.miniCaseOpt2.trim()
    ].filter(Boolean);
    const hasMiniCase =
      sectionForm.miniCaseScenario.trim() && miniCaseOpts.length >= 2;

    const secObj = {
      id: editingSectionId || `sec-${Date.now()}`,
      heading: sectionForm.heading.trim(),
      layout: sectionForm.layout || 'stacked',
      body: sectionForm.body.trim(),
      calloutType: sectionForm.calloutType || 'pearl',
      pearl: sectionForm.pearl.trim(),
      comparisonTable: sectionForm.comparisonTable || [],
      flashcard: hasFlashcard
        ? {
            front: sectionForm.flashcardFront.trim(),
            back: sectionForm.flashcardBack.trim()
          }
        : undefined,
      miniCase: hasMiniCase
        ? {
            scenario: sectionForm.miniCaseScenario.trim(),
            options: miniCaseOpts,
            correctIndex: Math.min(
              Number(sectionForm.miniCaseCorrect),
              miniCaseOpts.length - 1
            ),
            feedback: sectionForm.miniCaseFeedback.trim()
          }
        : undefined,
      images: sectionForm.images,
      videos: sectionForm.videos
    };

    const nextModules = learningModules.map((m) => {
      if (m.id !== adminModule.id) return m;
      const exists = m.sections.some((s) => s.id === editingSectionId);
      const updatedSections = exists
        ? m.sections.map((s) => (s.id === editingSectionId ? secObj : s))
        : [...m.sections, secObj];
      return { ...m, sections: updatedSections };
    });

    publishCloudUpdate({
      nextModules,
      actionDescription: `Saved section "${secObj.heading}" in ${adminModule.title}`
    });
    notifyCms(`Saved section "${secObj.heading}" & synced to Cloud`);
    resetSectionForm();
  };

  const handleMoveSection = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= adminModule.sections.length) return;
    const nextModules = learningModules.map((m) => {
      if (m.id !== adminModule.id) return m;
      const copy = [...m.sections];
      const [moved] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, moved);
      return { ...m, sections: copy };
    });
    publishCloudUpdate({
      nextModules,
      actionDescription: `Reordered sections in ${adminModule.title}`
    });
  };

  const handleDeleteSection = (secId) => {
    if (adminModule.sections.length <= 1) return;
    const nextModules = learningModules.map((m) => {
      if (m.id !== adminModule.id) return m;
      return { ...m, sections: m.sections.filter((s) => s.id !== secId) };
    });
    publishCloudUpdate({
      nextModules,
      actionDescription: `Removed section from ${adminModule.title}`
    });
    if (editingSectionId === secId) resetSectionForm();
  };

  const handleAddQuizQuestion = (e) => {
    e.preventDefault();
    if (!newQuizDraft.q.trim() || !newQuizDraft.opt0.trim() || !newQuizDraft.opt1.trim()) return;
    const options = [
      newQuizDraft.opt0.trim(),
      newQuizDraft.opt1.trim(),
      newQuizDraft.opt2.trim()
    ].filter(Boolean);

    const newQ = {
      q: newQuizDraft.q.trim(),
      options,
      correct: Math.min(Number(newQuizDraft.correct), options.length - 1),
      explanation: newQuizDraft.explanation.trim()
    };

    const nextModules = learningModules.map((m) =>
      m.id === adminModule.id ? { ...m, quiz: [...m.quiz, newQ] } : m
    );
    publishCloudUpdate({
      nextModules,
      actionDescription: `Added quiz question to ${adminModule.title}`
    });

    setNewQuizDraft({
      q: '',
      opt0: '',
      opt1: '',
      opt2: '',
      correct: 0,
      explanation: ''
    });
    notifyCms('Added quiz question & synced to Cloud');
  };

  const handleDeleteQuizQuestion = (qIndex) => {
    const nextModules = learningModules.map((m) =>
      m.id === adminModule.id
        ? { ...m, quiz: m.quiz.filter((_, i) => i !== qIndex) }
        : m
    );
    publishCloudUpdate({
      nextModules,
      actionDescription: `Deleted quiz question from ${adminModule.title}`
    });
  };

  // Downloadable / Printable Pocket Reference One-Pager per Module
  const handlePrintModulePocketGuide = (mod) => {
    if (!mod) return;
    const printWin = window.open('', '_blank', 'width=900,height=1000');
    if (!printWin) return;

    const objectivesHtml = (mod.learningObjectives || [])
      .map((o) => `<li>${o}</li>`)
      .join('');

    const sectionsHtml = (mod.sections || [])
      .map((sec, idx) => {
        const tableHtml =
          sec.comparisonTable && sec.comparisonTable.length > 0
            ? `<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:12px;">
                ${sec.comparisonTable
                  .map(
                    (r) =>
                      `<tr><td style="border:1px solid #cbd5e1;padding:6px 8px;font-weight:bold;background:#f8fafc;width:34%;">${r.label}</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${r.value}</td></tr>`
                  )
                  .join('')}
              </table>`
            : '';
        const pearlHtml = sec.pearl
          ? `<div style="background:#ecfdf5;border-left:4px solid #059669;padding:8px 12px;margin-top:8px;font-size:12px;color:#065f46;"><strong>Clinical Takeaway:</strong> ${sec.pearl}</div>`
          : '';
        return `
          <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
            <h3 style="margin:0 0 6px 0;font-size:15px;color:#0f172a;">${idx + 1}. ${sec.heading}</h3>
            <div style="font-size:12.5px;line-height:1.55;color:#334155;white-space:pre-line;">${(sec.body || '').replace(/\*\*/g, '')}</div>
            ${tableHtml}
            ${pearlHtml}
          </div>
        `;
      })
      .join('');

    printWin.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>PaedTraches.co.uk — Pocket Reference: ${mod.title}</title>
    <style>
      @page { size: portrait; margin: 14mm; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; }
    </style>
  </head>
  <body>
    <div style="border-bottom:2px solid #059669;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:11px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:0.06em;">PaedTraches.co.uk • Pocket Reference One-Pager</div>
        <h1 style="margin:4px 0 0 0;font-size:20px;">${mod.title}</h1>
      </div>
      <div style="font-size:11px;color:#64748b;text-align:right;">
        ${mod.category}<br/>${INITIAL_GOVERNANCE_META.version}
      </div>
    </div>
    ${
      objectivesHtml
        ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-bottom:16px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#475569;margin-bottom:4px;">Learning Objectives</div>
            <ul style="margin:0;padding-left:18px;font-size:12px;color:#334155;line-height:1.5;">${objectivesHtml}</ul>
          </div>`
        : ''
    }
    ${sectionsHtml}
    <div style="font-size:10.5px;color:#64748b;margin-top:12px;">
      PaedTraches.co.uk Clinical Reference Aid — Follow local NHS Trust & JRCALC guidelines. Peer reviewed ${mod.peerReviewedDate || INITIAL_GOVERNANCE_META.lastReviewed}.
    </div>
    <script>setTimeout(function(){ window.print(); }, 250);</script>
  </body>
</html>`);
    printWin.document.close();
  };

  const handleResetFactoryData = () => {
    publishCloudUpdate({
      nextPathways: INITIAL_PATHWAYS,
      nextModules: INITIAL_LEARNING_MODULES,
      nextHardware: INITIAL_TUBE_HARDWARE_GUIDE,
      nextSims: INITIAL_PROCEDURE_SIMULATIONS,
      nextAdmins: INITIAL_ADMIN_USERS,
      actionDescription: 'Reset pathways, modules, Tube ID & Sims to factory defaults'
    });
    notifyCms('Restored default clinical pathways & synced to Cloud');
  };

  // Tube ID Hardware Admin Handlers
  const resetHardwareForm = () => {
    setEditingHardwareId(null);
    setHardwareForm({
      name: '',
      tag: 'Paediatric Tracheostomy Tube',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      imageUrl: '',
      cuffType: '',
      innerCannula: 'None (Single-lumen)',
      keyVisualCue: '',
      emergencyAction: ''
    });
  };

  const loadHardwareIntoForm = (hw) => {
    setEditingHardwareId(hw.id);
    setHardwareForm({
      name: hw.name || '',
      tag: hw.tag || '',
      tagColor: hw.tagColor || 'bg-emerald-50 text-emerald-700 border-emerald-200',
      imageUrl: hw.imageUrl || '',
      cuffType: hw.cuffType || '',
      innerCannula: hw.innerCannula || '',
      keyVisualCue: hw.keyVisualCue || '',
      emergencyAction: hw.emergencyAction || ''
    });
  };

  const handleUploadHardwareImageFile = (file) => {
    if (!file) return;
    if (!storage) {
      notifyCms('Firebase Storage is not connected. Paste an image URL instead.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      notifyCms('Image exceeds 15 MB limit.');
      return;
    }
    setUploadingHardwarePhoto(true);
    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const fileRef = storageRef(
      storage,
      `artifacts/${appId}/public/media/hardware/${safeFileName}`
    );
    const uploadTask = uploadBytesResumable(fileRef, file);
    uploadTask.on(
      'state_changed',
      () => {},
      (err) => {
        setUploadingHardwarePhoto(false);
        notifyCms(err.message || 'Upload failed.');
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        setHardwareForm((prev) => ({ ...prev, imageUrl: downloadUrl }));
        setUploadingHardwarePhoto(false);
        notifyCms('Tube photo uploaded! Click Save Tube Item to publish.');
      }
    );
  };

  const handleSaveHardwareItem = (e) => {
    e.preventDefault();
    if (!hardwareForm.name.trim()) return;
    const itemObj = {
      id: editingHardwareId || `hw-${Date.now()}`,
      name: hardwareForm.name.trim(),
      tag: hardwareForm.tag.trim() || 'Tracheostomy Equipment',
      tagColor: hardwareForm.tagColor,
      imageUrl: hardwareForm.imageUrl.trim(),
      cuffType: hardwareForm.cuffType.trim(),
      innerCannula: hardwareForm.innerCannula.trim(),
      keyVisualCue: hardwareForm.keyVisualCue.trim(),
      emergencyAction: hardwareForm.emergencyAction.trim()
    };

    const exists = tubeHardwareList.some((h) => h.id === editingHardwareId);
    const nextHardware = exists
      ? tubeHardwareList.map((h) => (h.id === editingHardwareId ? itemObj : h))
      : [...tubeHardwareList, itemObj];

    publishCloudUpdate({
      nextHardware,
      actionDescription: `Saved Tube ID item "${itemObj.name}"`
    });
    notifyCms(`Saved "${itemObj.name}" to Tube ID & synced to Cloud`);
    resetHardwareForm();
  };

  const handleDeleteHardwareItem = (hwId) => {
    if (tubeHardwareList.length <= 1) return;
    const target = tubeHardwareList.find((h) => h.id === hwId);
    const nextHardware = tubeHardwareList.filter((h) => h.id !== hwId);
    publishCloudUpdate({
      nextHardware,
      actionDescription: `Removed Tube ID item "${target?.name || hwId}"`
    });
    if (editingHardwareId === hwId) resetHardwareForm();
    notifyCms('Removed item from Tube ID');
  };

  // ==========================================
  // FULL ADMIN PROCEDURE SIM DESIGNER HANDLERS
  // ==========================================
  const activeSim = useMemo(
    () => procedureSims.find((s) => s.id === activeSimId) || procedureSims[0],
    [procedureSims, activeSimId]
  );

  const visibleSimSteps = useMemo(() => {
    if (!activeSim) return [];
    if (activeSim.supportsAgeSwitch === false) return activeSim.steps || [];
    const filtered = (activeSim.steps || []).filter((st) => {
      const groups =
        Array.isArray(st.ageGroups) && st.ageGroups.length > 0
          ? st.ageGroups
          : ['all'];
      return groups.includes('all') || groups.includes(simAgeGroup);
    });
    return filtered.length > 0 ? filtered : activeSim.steps || [];
  }, [activeSim, simAgeGroup]);

  // Auto-reset simulation progress cleanly whenever the user switches patient age group
  const handleSimAgeGroupChange = (newAgeId) => {
    setSimAgeGroup(newAgeId);
    setSimStepIndex(0);
    setSimCompletedSteps({});
    simDragActiveRef.current = false;
    simStrokeRef.current = [];
    simPaintedRef.current = {};
    simProgressRef.current = 0;
    if (simLivePolylineRef.current) simLivePolylineRef.current.setAttribute('points', '');
    if (simLiveProgressTextRef.current) simLiveProgressTextRef.current.textContent = '0%';
    setSimDragActive(false);
    setSimDragCurrent(null);
    setSimStrokePoints([]);
    setSimPaintedCells({});
    setSimActionProgress(0);
    setSimFeedbackBanner(null);
    setSimShowMeHint(false);

    const nextSteps = (activeSim?.steps || []).filter((st) => {
      const groups =
        Array.isArray(st.ageGroups) && st.ageGroups.length > 0
          ? st.ageGroups
          : ['all'];
      return groups.includes('all') || groups.includes(newAgeId);
    });
    if (nextSteps[0]?.requiredTool) {
      setSelectedSimTool(nextSteps[0].requiredTool);
    }
  };

  // Top-level hold timer for 'hold' steps in Procedure Sim (keeps hook order stable)
  useEffect(() => {
    if (appMode !== 'learning' || learningSectionTab !== 'simulator') return;
    if (!simDisclaimerAccepted) return;
    if (!simDragActive || !activeSim || visibleSimSteps.length === 0) return;

    const safeIdx = Math.min(simStepIndex, Math.max(0, visibleSimSteps.length - 1));
    const stepObj = visibleSimSteps[safeIdx] || visibleSimSteps[0];
    if (!stepObj || (stepObj.interactionType || 'tap') !== 'hold') return;

    const stepKey = `${activeSim.id}-${stepObj.id}`;
    if (simCompletedSteps[stepKey]) return;

    const timer = setInterval(() => {
      setSimActionProgress((prev) => {
        const next = Math.min(100, prev + 5);
        if (next >= 100) {
          clearInterval(timer);
          setSimCompletedSteps((p) => ({ ...p, [stepKey]: true }));
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
        return next;
      });
    }, 80);

    return () => clearInterval(timer);
  }, [
    appMode,
    learningSectionTab,
    simDisclaimerAccepted,
    simDragActive,
    activeSim,
    visibleSimSteps,
    simStepIndex,
    simCompletedSteps
  ]);

  const adminSim = useMemo(
    () => procedureSims.find((s) => s.id === adminSimId) || procedureSims[0],
    [procedureSims, adminSimId]
  );

  const currentAdminSimStep =
    adminSim?.steps?.[editingSimStepIdx] || adminSim?.steps?.[0];

  const handleUploadSimDiagramFile = (file) => {
    if (!file) return;
    if (!storage) {
      notifyCms('Firebase Storage is not connected. Paste an image URL instead.');
      return;
    }
    setUploadingSimDiagram(true);
    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const fileRef = storageRef(
      storage,
      `artifacts/${appId}/public/media/diagrams/${safeFileName}`
    );
    const uploadTask = uploadBytesResumable(fileRef, file);
    uploadTask.on(
      'state_changed',
      () => {},
      (err) => {
        setUploadingSimDiagram(false);
        notifyCms(err.message || 'Upload failed.');
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        const nextSims = procedureSims.map((s) =>
          s.id === adminSim.id
            ? { ...s, diagramType: 'custom-image', customDiagramUrl: downloadUrl }
            : s
        );
        publishCloudUpdate({
          nextSims,
          actionDescription: `Uploaded custom diagram for "${adminSim.title}"`
        });
        setUploadingSimDiagram(false);
        notifyCms('Custom anatomical diagram uploaded & synced live!');
      }
    );
  };

  const handleUpdateAdminSimMeta = (field, value) => {
    const nextSims = procedureSims.map((s) => {
      if (s.id !== adminSim.id) return s;
      if (field === 'customDiagramUrl') {
        const trimmed = value.trim();
        return {
          ...s,
          diagramType: trimmed ? 'custom-image' : 'builtin-neck',
          customDiagramUrl: trimmed
        };
      }
      return { ...s, [field]: value };
    });
    publishCloudUpdate({
      nextSims,
      actionDescription: `Updated Procedure Sim "${adminSim.title}"`
    });
  };

  const handleUpdateSimStepField = (field, value) => {
    const nextSims = procedureSims.map((s) => {
      if (s.id !== adminSim.id) return s;
      const updatedSteps = s.steps.map((st, idx) =>
        idx === editingSimStepIdx ? { ...st, [field]: value } : st
      );
      return { ...s, steps: updatedSteps };
    });
    publishCloudUpdate({
      nextSims,
      actionDescription: `Updated step ${editingSimStepIdx + 1} in "${adminSim.title}"`
    });
  };

  const handleAddSimStep = () => {
    const newStepNumber = (adminSim?.steps?.length || 0) + 1;
    const defaultToolId = adminSim?.tools?.[0]?.id || 'tool-hands';
    const newStepObj = {
      id: `${adminSim.id}-step-${Date.now().toString().slice(-4)}`,
      phase: `Phase ${newStepNumber}`,
      title: `Step ${newStepNumber}: New Procedure Action`,
      instruction: 'Drag or tap the required instrument onto the anatomical diagram.',
      traineeTip: 'Add surgical / ENT clinical caveat here.',
      basicNote: 'Plain-language anatomical explanation.',
      requiredTool: defaultToolId,
      ageGroups: ['all'],
      interactionType: 'tap',
      targetZone: { x: 250, y: 170, r: 40, label: 'Target Landmark' },
      demoHint: 'Drag or tap the required instrument onto the highlighted circle.'
    };
    const nextSims = procedureSims.map((s) =>
      s.id === adminSim.id ? { ...s, steps: [...s.steps, newStepObj] } : s
    );
    publishCloudUpdate({
      nextSims,
      actionDescription: `Added Step ${newStepNumber} to "${adminSim.title}"`
    });
    setEditingSimStepIdx(newStepNumber - 1);
    notifyCms(`Added Step ${newStepNumber} — tap the diagram to place its hotspot!`);
  };

  const handleDeleteSimStep = (idxToRemove) => {
    if (!adminSim || adminSim.steps.length <= 1) return;
    const nextSims = procedureSims.map((s) =>
      s.id === adminSim.id
        ? { ...s, steps: s.steps.filter((_, i) => i !== idxToRemove) }
        : s
    );
    publishCloudUpdate({
      nextSims,
      actionDescription: `Removed step from "${adminSim.title}"`
    });
    setEditingSimStepIdx(Math.max(0, idxToRemove - 1));
    notifyCms('Removed step from simulation');
  };

  const handleSetHotspotByClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 500);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 340);
    const nextSims = procedureSims.map((s) => {
      if (s.id !== adminSim.id) return s;
      const updatedSteps = s.steps.map((st, idx) =>
        idx === editingSimStepIdx
          ? {
              ...st,
              targetZone: { ...st.targetZone, x, y },
              dragStart: { x: Math.max(40, x - 35), y },
              dragEnd: { x: Math.min(460, x + 35), y: Math.min(310, y + 40) }
            }
          : st
      );
      return { ...s, steps: updatedSteps };
    });
    publishCloudUpdate({
      nextSims,
      actionDescription: `Moved hotspot target on "${adminSim.title}" Step ${
        editingSimStepIdx + 1
      }`
    });
    notifyCms(`Placed Step ${editingSimStepIdx + 1} hotspot at (${x}, ${y})`);
  };

  const handleCreateNewSim = (e) => {
    e.preventDefault();
    if (!newSimForm.title.trim()) return;
    const newId = `sim-${Date.now().toString().slice(-4)}`;
    const defaultTools = INITIAL_PROCEDURE_SIMULATIONS[0].tools;
    const created = {
      id: newId,
      title: newSimForm.title.trim(),
      subtitle: newSimForm.subtitle.trim() || 'Custom clinical procedure walkthrough',
      badge: 'Interactive Procedure Sim',
      diagramType: newSimForm.customDiagramUrl.trim() ? 'custom-image' : 'builtin-neck',
      customDiagramUrl: newSimForm.customDiagramUrl.trim(),
      supportsAgeSwitch: false,
      disclaimer:
        'Educational anatomical & procedural simulation only. Follow local NHS Trust & specialist airway protocols.',
      tools: defaultTools,
      steps: [
        {
          id: `${newId}-step-1`,
          phase: 'Step 1 • Anatomical Landmark',
          title: 'Identify Primary Anatomical Target',
          instruction: 'Select Palpate and tap the marked target on the diagram.',
          traineeTip: 'Verify midline anatomical landmarks before proceeding.',
          basicNote: 'Tap the target location on the diagram.',
          requiredTool: defaultTools[0].id,
          interactionType: 'tap',
          targetZone: { x: 250, y: 170, r: 40, label: 'Primary Landmark' },
          demoHint: 'Select "Palpate" and tap the highlighted circle.'
        }
      ]
    };
    const nextSims = [...procedureSims, created];
    publishCloudUpdate({
      nextSims,
      actionDescription: `Created new Procedure Sim "${created.title}"`
    });
    setAdminSimId(newId);
    setEditingSimStepIdx(0);
    setShowNewSimModal(false);
    setNewSimForm({ title: '', subtitle: '', customDiagramUrl: '' });
    notifyCms(`Created Procedure Sim "${created.title}"`);
  };

  const handleDeleteSim = (simId) => {
    if (procedureSims.length <= 1) return;
    const target = procedureSims.find((s) => s.id === simId);
    const remaining = procedureSims.filter((s) => s.id !== simId);
    publishCloudUpdate({
      nextSims: remaining,
      actionDescription: `Deleted Procedure Sim "${target?.title || simId}"`
    });
    setAdminSimId(remaining[0].id);
    setEditingSimStepIdx(0);
    notifyCms('Deleted Procedure Sim');
  };

  const currentSizingRow = useMemo(
    () => SUCTION_SIZING_TABLE.find((r) => r.id === selectedTubeIdSize) || SUCTION_SIZING_TABLE[3],
    [selectedTubeIdSize]
  );

  const activeModule = useMemo(
    () => learningModules.find((m) => m.id === activeModuleId) || null,
    [learningModules, activeModuleId]
  );

  const shuffledQuizQuestions = useMemo(() => {
    if (!activeModule || !Array.isArray(activeModule.quiz)) return [];
    return activeModule.quiz.map((qItem) => {
      const mapped = qItem.options.map((text, origIdx) => ({
        text,
        isCorrect: origIdx === qItem.correct
      }));
      for (let i = mapped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
      }
      return {
        q: qItem.q,
        options: mapped.map((m) => m.text),
        correct: mapped.findIndex((m) => m.isCorrect),
        explanation: qItem.explanation
      };
    });
  }, [activeModule, quizAttemptSeed]);

  // Reusable Section Content Renderer
  const renderFormattedSectionContent = (sec) => {
    const layout = sec.layout || 'stacked';
    const hasMedia =
      (sec.images && sec.images.length > 0) ||
      (sec.videos && sec.videos.length > 0);
    const isSideBySide =
      hasMedia && (layout === 'media-right' || layout === 'media-left');

    const calloutStyle =
      sec.calloutType === 'warning'
        ? {
            bg: 'bg-amber-50/90 border-amber-200 text-amber-950',
            icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
            label: 'Clinical Safety Caution'
          }
        : sec.calloutType === 'info'
        ? {
            bg: 'bg-sky-50/90 border-sky-200 text-sky-950',
            icon: <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />,
            label: 'Key Reference Note'
          }
        : {
            bg: 'bg-emerald-50/70 border-emerald-200 text-emerald-950',
            icon: <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
            label: 'Clinical Takeaway'
          };

    const renderMediaBlocks = () => (
      <div className="space-y-4">
        {sec.images && sec.images.length > 0 && (
          <div
            className={`grid gap-4 ${
              isSideBySide || sec.images.length === 1
                ? 'grid-cols-1'
                : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
            {sec.images.map((img) => (
              <div
                key={img.id}
                className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs"
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full max-h-72 object-cover"
                />
                <div className="p-3.5">
                  <div className="font-bold text-xs sm:text-sm text-slate-900">
                    {img.title}
                  </div>
                  {img.caption && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {img.caption}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {sec.videos && sec.videos.length > 0 && (
          <div className="space-y-4">
            {sec.videos.map((vid) => {
              const embed = getEmbedVideoInfo(vid.url);
              return (
                <div
                  key={vid.id}
                  className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs"
                >
                  {embed.type === 'iframe' && (
                    <div className="aspect-video w-full bg-slate-900">
                      <iframe
                        src={embed.src}
                        title={vid.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {embed.type === 'video' && (
                    <video
                      src={embed.src}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-80 bg-slate-950"
                    />
                  )}

                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Video className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {vid.title}
                        </span>
                        {vid.duration && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                            {vid.duration}
                          </span>
                        )}
                      </div>
                      {vid.description && (
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {vid.description}
                        </p>
                      )}
                    </div>

                    {embed.type === 'link' && (
                      <a
                        href={vid.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Open Video</span>
                      </a>
                    )}
                  </div>

                  {vid.transcript && (
                    <div className="border-t border-slate-200/80 bg-white/80 px-3.5 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedVideoTranscripts((prev) => ({
                            ...prev,
                            [vid.id]: !prev[vid.id]
                          }))
                        }
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>
                          {expandedVideoTranscripts[vid.id]
                            ? 'Hide Video Chapters & Key Notes'
                            : 'View Video Chapters & Key Notes (Quiet Study)'}
                        </span>
                      </button>
                      {expandedVideoTranscripts[vid.id] && (
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          {vid.transcript}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );

    const flashcardObj =
      sec.flashcard ||
      (sec.flashcardFront && sec.flashcardBack
        ? { front: sec.flashcardFront, back: sec.flashcardBack }
        : null);

    const miniCaseObj =
      sec.miniCase ||
      (sec.miniCaseScenario && sec.miniCaseOpt0 && sec.miniCaseOpt1
        ? {
            scenario: sec.miniCaseScenario,
            options: [sec.miniCaseOpt0, sec.miniCaseOpt1, sec.miniCaseOpt2].filter(
              Boolean
            ),
            correctIndex: Number(sec.miniCaseCorrect || 0),
            feedback: sec.miniCaseFeedback || ''
          }
        : null);

    const secKey = sec.id || sec.heading || 'preview';
    const isCardFlipped = !!flippedFlashcards[secKey];
    const selectedCaseOption = miniCaseAnswers[secKey];

    const renderTextBlock = () => (
      <div className="space-y-4">
        <RichFormattedText text={sec.body} largeText={moduleLargeText} />

        {sec.comparisonTable && sec.comparisonTable.length > 0 && (
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/70 shadow-2xs">
            <div className="divide-y divide-slate-200">
              {sec.comparisonTable.map((row, rIdx) => (
                <div
                  key={rIdx}
                  className={`grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3 px-4 py-3 ${
                    moduleLargeText ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                  }`}
                >
                  <div className="sm:col-span-4 font-bold text-slate-900">
                    {row.label}
                  </div>
                  <div className="sm:col-span-8 text-slate-700 leading-relaxed">
                    {renderInlineBold(row.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {flashcardObj && (
          <button
            type="button"
            onClick={() =>
              setFlippedFlashcards((prev) => ({
                ...prev,
                [secKey]: !prev[secKey]
              }))
            }
            className={`w-full text-left p-4 rounded-2xl border-2 transition shadow-2xs space-y-1.5 ${
              isCardFlipped
                ? 'bg-sky-50/90 border-sky-300 text-sky-950'
                : 'bg-slate-50 hover:bg-slate-100/80 border-dashed border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold uppercase tracking-wider text-sky-700">
              <span className="flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5" />
                <span>
                  {isCardFlipped
                    ? 'Active Recall Answer (Tap to Flip Back)'
                    : 'Active Recall Check — Tap to Flip Card'}
                </span>
              </span>
            </div>
            <div
              className={`font-semibold leading-relaxed ${
                moduleLargeText ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
              }`}
            >
              {isCardFlipped ? flashcardObj.back : flashcardObj.front}
            </div>
          </button>
        )}

        {miniCaseObj && (
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200/90 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-800">
              <Stethoscope className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Interactive Bedside Mini-Case</span>
            </div>
            <p
              className={`font-medium text-slate-800 leading-relaxed ${
                moduleLargeText ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
              }`}
            >
              {miniCaseObj.scenario}
            </p>
            <div className="space-y-2">
              {miniCaseObj.options.map((opt, oIdx) => {
                const isChosen = selectedCaseOption === oIdx;
                const isRight = miniCaseObj.correctIndex === oIdx;
                let style =
                  'bg-white border-slate-200 text-slate-800 hover:border-indigo-300';
                if (selectedCaseOption !== undefined) {
                  if (isRight) {
                    style =
                      'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
                  } else if (isChosen && !isRight) {
                    style = 'bg-rose-50 border-rose-300 text-rose-900';
                  }
                }
                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() =>
                      setMiniCaseAnswers((prev) => ({
                        ...prev,
                        [secKey]: oIdx
                      }))
                    }
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-2 ${
                      moduleLargeText ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                    } ${style}`}
                  >
                    <span>{opt}</span>
                    {selectedCaseOption !== undefined && isRight && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            {selectedCaseOption !== undefined && miniCaseObj.feedback && (
              <div className="p-3 rounded-xl bg-white/90 border border-indigo-200 text-xs text-slate-700 leading-relaxed">
                <strong>Clinical Rationale:</strong> {miniCaseObj.feedback}
              </div>
            )}
          </div>
        )}

        {sec.pearl && (
          <div
            className={`p-4 rounded-2xl border font-medium flex items-start gap-2.5 ${calloutStyle.bg} ${
              moduleLargeText ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
            }`}
          >
            {calloutStyle.icon}
            <div>
              <strong>{calloutStyle.label}:</strong> {sec.pearl}
            </div>
          </div>
        )}
      </div>
    );

    if (isSideBySide) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div
            className={`md:col-span-6 ${
              layout === 'media-left' ? 'md:order-2' : 'md:order-1'
            }`}
          >
            {renderTextBlock()}
          </div>
          <div
            className={`md:col-span-6 ${
              layout === 'media-left' ? 'md:order-1' : 'md:order-2'
            }`}
          >
            {renderMediaBlocks()}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {renderTextBlock()}
        {hasMedia && renderMediaBlocks()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden">
      {/* ==========================================
          TOP NAVIGATION BAR (TWO CLEAN HEADINGS: ON-CALL PATHWAYS & LEARNING)
          ========================================== */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-3">
          {/* Brand Logo: PaedTraches */}
          <button
            onClick={() => {
              setAppMode('oncall');
              setActivePathwayId(null);
              setOnCallSubView('main');
            }}
            className="flex items-center gap-2.5 text-left group min-w-0"
          >
            <PaedTrachesLogo className="w-9 h-9 sm:w-10 sm:h-10" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 block leading-none truncate">
                  PaedTraches
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                    cloudStatus === 'synced'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      cloudStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="hidden md:inline">
                    {cloudStatus === 'synced' ? 'Cloud Live' : 'Offline Ready'}
                  </span>
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 hidden sm:block mt-0.5 truncate">
                Paediatric Tracheostomy Reference
              </span>
            </div>
          </button>

          {/* Center Segmented Control: On-Call Pathways | Learning */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            <button
              onClick={() => setAppMode('oncall')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                appMode === 'oncall'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>On-Call Pathways</span>
            </button>

            <button
              onClick={() => setAppMode('learning')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                appMode === 'learning'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-sky-600" />
              <span>Learning</span>
            </button>
          </div>

          {/* Right Actions: Search + Offline & App + Admin */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => {
                setGlobalSearchQuery('');
                setShowGlobalSearch(true);
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1.5 text-xs font-medium border border-transparent hover:border-slate-200"
              title="Quick Clinical Search (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
              <span className="hidden lg:inline">Search</span>
            </button>

            <button
              onClick={() => setShowPwaModal(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1.5 text-xs font-medium"
              title="Save App & Offline Shift Cache"
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span className="hidden lg:inline">Offline &amp; App</span>
            </button>

            <button
              onClick={() => {
                setAppMode(appMode === 'admin' ? 'oncall' : 'admin');
                resetAdminForm();
                resetSectionForm();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                appMode === 'admin'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {isAdminAuthenticated ? (
                <Unlock className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span>
                {isAdminAuthenticated ? currentAdminUser.name.split(' ')[0] : 'Admin'}
              </span>
            </button>
          </div>
        </div>

        {/* MOBILE SECOND ROW (Phones Only): On-Call Pathways | Learning | Tube Sizer | Pre-Alert */}
        <div className="sm:hidden border-t border-slate-100 bg-slate-50/90 px-3 py-1.5 grid grid-cols-4 gap-1.5">
          <button
            onClick={() => {
              setAppMode('oncall');
              setActivePathwayId(null);
              setOnCallSubView('main');
            }}
            className={`py-1.5 px-1.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold transition ${
              appMode === 'oncall'
                ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span>On-Call</span>
          </button>

          <button
            onClick={() => setAppMode('learning')}
            className={`py-1.5 px-1.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold transition ${
              appMode === 'learning'
                ? 'bg-white text-sky-700 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Learning</span>
          </button>

          <button
            onClick={() => setActiveToolModal('calculator')}
            className="py-1.5 px-1.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Sizer</span>
          </button>

          <button
            onClick={() => setActiveToolModal('handover')}
            className="py-1.5 px-1.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition"
          >
            <Radio className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Pre-Alert</span>
          </button>
        </div>
      </header>

      {/* ==========================================
          MAIN CONTENT AREA
          ========================================== */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
        {/* ==========================================
            1A. ON-CALL HOME VIEW
            ========================================== */}
        {appMode === 'oncall' && !activePathwayId && onCallSubView === 'main' && (
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
                  onClick={() => setActiveToolModal('calculator')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition"
                >
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>Tube Sizer</span>
                </button>
                <button
                  onClick={() => setActiveToolModal('hardware')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold transition"
                >
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span>Tube ID</span>
                </button>
                <button
                  onClick={() => setActiveToolModal('troubleshoot')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold transition"
                >
                  <Wrench className="w-4 h-4 text-rose-600" />
                  <span>Airway Troubleshooting</span>
                </button>
                <button
                  onClick={() => setActiveToolModal('checklist')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold transition"
                >
                  <ClipboardCheck className="w-4 h-4 text-sky-600" />
                  <span>Go-Bag Check</span>
                </button>
                <button
                  onClick={() => setActiveToolModal('handover')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition"
                >
                  <Radio className="w-4 h-4 text-amber-600" />
                  <span>A&amp;E Pre-Alert</span>
                </button>
              </div>
            </div>

            {/* Core Emergency Pathway Cards */}
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Core Emergency Pathways
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                {coreEmergencyPathways.map((pathway) => {
                  const style = getThemeStyles(pathway.theme);
                  return (
                    <button
                      key={pathway.id}
                      onClick={() => handleOpenPathway(pathway.id)}
                      className={`w-full text-left bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-5 group ${style.topBar} ${style.cardHover}`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {pathway.badge}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {pathway.nodes.length} steps
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-slate-950">
                          {pathway.title}
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          {pathway.subtitle}
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

            {/* Bottom Row: Extra Pathways + Roadside Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
              <div className="lg:col-span-5 space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Secondary &amp; Routine Care
                </h2>
                <button
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
                        Routine suctioning, humidification, post-decannulation monitoring &amp; custom pathways
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
                    onClick={() => setActiveToolModal('calculator')}
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
                    onClick={() => setActiveToolModal('hardware')}
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
                    onClick={() => setActiveToolModal('troubleshoot')}
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
                    onClick={() => setActiveToolModal('checklist')}
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
                    onClick={() => setActiveToolModal('handover')}
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

        {/* ==========================================
            1B. EXTRA PATHWAYS & ROUTINE CARE SUB-PAGE
            ========================================== */}
        {appMode === 'oncall' && !activePathwayId && onCallSubView === 'extra' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <button
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
                Secondary clinical pathways for routine suctioning, humidification, and post-decannulation transport.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {extraRoutinePathways.map((pathway) => {
                const style = getThemeStyles(pathway.theme);
                return (
                  <button
                    key={pathway.id}
                    onClick={() => handleOpenPathway(pathway.id)}
                    className={`w-full text-left bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 group ${style.topBar} ${style.cardHover}`}
                  >
                    <div className="space-y-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.pill}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {pathway.badge}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">
                        {pathway.title}
                      </h3>
                      <p className="text-sm text-slate-500">{pathway.subtitle}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-700 shrink-0 transition">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            1C. ACTIVE PATHWAY VIEW
            ========================================== */}
        {appMode === 'oncall' && activePathwayId && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => setActivePathwayId(null)}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 py-1.5 px-3 rounded-xl hover:bg-slate-200/60 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Pathways</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCprTimer((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    showCprTimer || timerRunning
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>{timerRunning ? formatTime(timerSeconds) : '2m CPR'}</span>
                </button>

                <button
                  onClick={() => setActiveToolModal('calculator')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
                >
                  <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sizer</span>
                </button>

                <div className="inline-flex bg-slate-200/70 p-1 rounded-xl">
                  <button
                    onClick={() => setPathwayViewMode('interactive')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      pathwayViewMode === 'interactive'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Step-by-Step
                  </button>
                  <button
                    onClick={() => setPathwayViewMode('overview')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      pathwayViewMode === 'overview'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Flowchart
                  </button>
                </div>
              </div>
            </div>

            {showCprTimer && (
              <div className="bg-white rounded-2xl p-3.5 border border-rose-200 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="font-mono text-xl font-bold text-slate-900">
                    {formatTime(timerSeconds)}
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    Cycle {Math.floor(timerSeconds / 120) + 1} (2-min rhythm/pulse check)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setTimerRunning((prev) => !prev)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{timerRunning ? 'Pause' : 'Start'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerSeconds(0);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 px-1">
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    getThemeStyles(activePathway.theme).pill
                  }`}
                >
                  {activePathway.badge}
                </span>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mt-1">
                  {activePathway.title}
                </h1>
              </div>

              {pathwayViewMode === 'interactive' && nodeHistory.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleStepBack}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={handleRestartPathway}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    title="Restart Pathway"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {pathwayViewMode === 'interactive' && currentNode && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div
                  className={`lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 ${
                    getThemeStyles(activePathway.theme).topBar
                  }`}
                >
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Step {nodeHistory.length}
                    </div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-snug">
                      {cleanStepTitle(currentNode.title)}
                    </h2>
                    {currentNode.subtitle && (
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                        {currentNode.subtitle}
                      </p>
                    )}
                  </div>

                  {currentNode.criticalNote && (
                    <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm text-amber-950 leading-relaxed font-medium">
                        {currentNode.criticalNote}
                      </p>
                    </div>
                  )}

                  {currentNode.checklist && currentNode.checklist.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Action Checklist (Tap to tick)
                      </div>
                      <div className="space-y-2">
                        {currentNode.checklist.map((item, idx) => {
                          const isChecked = !!checkedItems[`${currentNode.id}-${idx}`];
                          return (
                            <button
                              key={idx}
                              onClick={() => toggleChecklistItem(currentNode.id, idx)}
                              className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition flex items-start gap-3.5 ${
                                isChecked
                                  ? 'bg-emerald-50/50 border-emerald-200 text-slate-400'
                                  : 'bg-[#F8FAFC] border-slate-200/90 hover:border-slate-300 text-slate-800'
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 shrink-0 border transition ${
                                  isChecked
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'bg-white border-slate-300'
                                }`}
                              >
                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              <span
                                className={`text-sm sm:text-base leading-snug ${
                                  isChecked ? 'line-through' : 'font-medium'
                                }`}
                              >
                                {item}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    {currentNode.question && (
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        {currentNode.question}
                      </h3>
                    )}

                    {currentNode.yesId && currentNode.noId && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => handleSelectDecision(currentNode.yesId)}
                          className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm sm:text-base shadow-sm transition flex items-center justify-between"
                        >
                          <span>{currentNode.yesLabel || 'Yes'}</span>
                          <ChevronRight className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => handleSelectDecision(currentNode.noId)}
                          className="w-full py-4 px-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm sm:text-base shadow-sm transition flex items-center justify-between"
                        >
                          <span>{currentNode.noLabel || 'No'}</span>
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}

                    {currentNode.nextId && !currentNode.yesId && (
                      <button
                        onClick={() => handleSelectDecision(currentNode.nextId)}
                        className={`w-full py-4 px-6 rounded-2xl font-semibold text-sm sm:text-base shadow-sm transition flex items-center justify-center gap-2 ${
                          getThemeStyles(activePathway.theme).primaryBtn
                        }`}
                      >
                        <span>Continue to Next Step</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}

                    {!currentNode.yesId && !currentNode.noId && !currentNode.nextId && (
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-emerald-900 text-sm font-semibold">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span>End of clinical pathway reached.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActiveToolModal('handover')}
                            className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                          >
                            Build A&amp;E Pre-Alert
                          </button>
                          <button
                            onClick={handleRestartPathway}
                            className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100"
                          >
                            Restart
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop Right Sidebar */}
                <div className="hidden lg:block lg:col-span-4 space-y-5 sticky top-24">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Pathway Progress Map
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {activePathway.nodes.length} steps
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {activePathway.nodes.map((n) => {
                        const isCurrent = n.id === currentNodeId;
                        const wasVisited = nodeHistory.includes(n.id);
                        return (
                          <button
                            key={n.id}
                            onClick={() => {
                              setCurrentNodeId(n.id);
                              setNodeHistory((prev) => [...prev, n.id]);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between gap-2 ${
                              isCurrent
                                ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                                : wasVisited
                                ? 'bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100/70'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span className="truncate">{cleanStepTitle(n.title)}</span>
                            {isCurrent && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Quick Tube Sizer
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">ID × 2 = Fr</span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
                      {SUCTION_SIZING_TABLE.map((row) => (
                        <button
                          key={row.id}
                          onClick={() => setSelectedTubeIdSize(row.id)}
                          className={`py-1.5 px-1 rounded-lg text-[11px] font-bold border transition ${
                            selectedTubeIdSize === row.id
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {row.id}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200">
                        <div className="text-[10px] font-semibold text-emerald-800">Catheter</div>
                        <div className="text-sm font-bold text-emerald-950 mt-0.5">
                          {currentSizingRow.catFr}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-sky-50/80 border border-sky-200">
                        <div className="text-[10px] font-semibold text-sky-800">Safe Depth</div>
                        <div className="text-xs font-bold text-sky-950 mt-0.5">
                          {currentSizingRow.depthCm}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200">
                        <div className="text-[10px] font-semibold text-amber-800">Downsize</div>
                        <div className="text-sm font-bold text-amber-950 mt-0.5">
                          {currentSizingRow.downsize}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {pathwayViewMode === 'overview' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 px-1">
                  Tap any step card below to inspect its full checklist or jump directly to that step.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activePathway.nodes.map((node, index) => {
                    const isCurrent = node.id === currentNodeId;
                    const yesTarget = activePathway.nodes.find((n) => n.id === node.yesId);
                    const noTarget = activePathway.nodes.find((n) => n.id === node.noId);
                    const nextTarget = activePathway.nodes.find((n) => n.id === node.nextId);

                    return (
                      <button
                        key={node.id}
                        onClick={() => setFlowchartInspectNode(node)}
                        className={`w-full text-left bg-white rounded-2xl p-5 border transition shadow-2xs hover:shadow-md flex flex-col justify-between ${
                          isCurrent
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Step {index + 1}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                Current Step
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-slate-900">
                            {cleanStepTitle(node.title)}
                          </h3>
                          {node.subtitle && (
                            <p className="text-xs sm:text-sm text-slate-500">
                              {node.subtitle}
                            </p>
                          )}
                        </div>

                        {(yesTarget || noTarget || nextTarget) && (
                          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                            {yesTarget && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium">
                                Yes → {cleanStepTitle(yesTarget.title)}
                              </span>
                            )}
                            {noTarget && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 font-medium">
                                No → {cleanStepTitle(noTarget.title)}
                              </span>
                            )}
                            {nextTarget && !yesTarget && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                                Next → {cleanStepTitle(nextTarget.title)}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Minimalist Collapsible NICE / NTSP Guideline Drawer at Bottom */}
            <div className="pt-2">
              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
                <button
                  onClick={() => setShowPathwayRefs((prev) => !prev)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      NICE, NTSP &amp; Evidence Guidelines ({(activePathway.references || []).length})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <span>{showPathwayRefs ? 'Hide links' : 'View links'}</span>
                    {showPathwayRefs ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </button>

                {showPathwayRefs && (
                  <div className="px-4 pb-3.5 pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50/50">
                    {(activePathway.references || []).length === 0 ? (
                      <p className="text-xs text-slate-400 py-1">
                        No external guideline links attached to this pathway yet.
                      </p>
                    ) : (
                      (activePathway.references || []).map((ref) => (
                        <a
                          key={ref.id}
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 text-xs transition group"
                        >
                          <div className="truncate">
                            <span className="font-semibold text-slate-800 group-hover:text-emerald-700">
                              {ref.title}
                            </span>
                            {ref.source && (
                              <span className="text-slate-400 ml-1.5">• {ref.source}</span>
                            )}
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                        </a>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            2. LEARNING HUB (MODULES OR PROCEDURE SIM)
            ========================================== */}
        {appMode === 'learning' && (
          <div className="space-y-6">
            {/* Learning Sub-Navigation Switcher: Learning Modules vs. Procedure Sim */}
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
                    onClick={() => {
                      setLearningSectionTab('simulator');
                      setSimFeedbackBanner(null);
                      setSimShowMeHint(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                      learningSectionTab === 'simulator'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Crosshair className="w-4 h-4 text-indigo-600" />
                    <span>Procedure Sim ({procedureSims.length})</span>
                  </button>
                </div>

                {learningSectionTab === 'modules' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openLockedFeedbackModal('All Learning Modules (Overall Curriculum)')
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Optional Feedback (All Modules)</span>
                    </button>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                      {completedModules.length} / {learningModules.length} Completed
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2A. LEARNING MODULES VIEW */}
            {learningSectionTab === 'modules' && (
              <>
                {!activeModule ? (
                  <>
                    <div className="space-y-1">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
                        Learning Modules
                      </h1>
                      <p className="text-sm sm:text-base text-slate-500">
                        Structured clinical modules with explicit learning objectives, formatted bullet takeaways, videos, and CPD certificates.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {learningModules.map((mod) => {
                        const isDone = completedModules.includes(mod.id);
                        return (
                          <button
                            key={mod.id}
                            onClick={() => {
                              setActiveModuleId(mod.id);
                              setActiveSectionIndex(0);
                              setMaxReachedSectionIndex(0);
                              setQuizUnlocked(false);
                              setQuizAttemptSeed((s) => s + 1);
                              setQuizAnswers({});
                              setQuizSubmitted(false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-full text-left bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between gap-5 group"
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                  {mod.category}
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
                              <p className="text-sm text-slate-500 leading-relaxed">
                                {mod.summary}
                              </p>
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
                  </>
                ) : (
                  <div
                    className={`space-y-6 rounded-3xl transition-colors ${
                      moduleNightMode
                        ? 'bg-slate-900 p-4 sm:p-6 border border-slate-800'
                        : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
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
                          onClick={() => handlePrintModulePocketGuide(activeModule)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                            moduleNightMode
                              ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                          title="Download / Print 1-Page Pocket Reference Summary"
                        >
                          <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">Pocket Guide</span>
                        </button>

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
                        {activeModule.category}
                      </span>
                      <h1
                        className={`text-2xl sm:text-3xl font-bold ${
                          moduleNightMode ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {activeModule.title}
                      </h1>
                    </div>

                    {!quizUnlocked &&
                      activeSectionIndex === 0 &&
                      Array.isArray(activeModule.learningObjectives) &&
                      activeModule.learningObjectives.length > 0 && (
                        <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                              <Target className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Module Learning Objectives</span>
                            </div>
                            {activeModule.targetAudience && (
                              <span className="text-[11px] font-medium text-emerald-900/80 bg-white/80 px-2.5 py-0.5 rounded-full border border-emerald-200/70">
                                Audience: {activeModule.targetAudience}
                              </span>
                            )}
                          </div>
                          <ul className="space-y-1.5 text-xs sm:text-sm text-emerald-950">
                            {activeModule.learningObjectives.map((obj, oIdx) => (
                              <li key={oIdx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="leading-snug">{obj}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <div className="hidden lg:block lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3 sticky top-24">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2.5">
                          Module Sections
                        </div>
                        <div className="space-y-1.5">
                          {activeModule.sections.map((s, idx) => {
                            const isSectionUnlocked = idx <= maxReachedSectionIndex;
                            return (
                              <button
                                key={s.id || idx}
                                disabled={!isSectionUnlocked}
                                onClick={() => {
                                  setQuizUnlocked(false);
                                  setActiveSectionIndex(idx);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition flex items-center justify-between gap-2 ${
                                  !quizUnlocked && activeSectionIndex === idx
                                    ? 'bg-slate-900 text-white font-semibold'
                                    : isSectionUnlocked
                                    ? 'text-slate-600 hover:bg-slate-100'
                                    : 'text-slate-400 bg-slate-50/70 opacity-60 cursor-not-allowed'
                                }`}
                              >
                                <span className="truncate">
                                  {idx + 1}. {s.heading}
                                </span>
                                {!isSectionUnlocked ? (
                                  <Lock className="w-3 h-3 shrink-0 text-slate-400" />
                                ) : !quizUnlocked && activeSectionIndex === idx ? (
                                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                ) : null}
                              </button>
                            );
                          })}

                          <div className="pt-2 border-t border-slate-100">
                            <button
                              disabled={
                                !quizUnlocked &&
                                maxReachedSectionIndex < activeModule.sections.length - 1
                              }
                              onClick={() => {
                                setQuizUnlocked(true);
                                setQuizAttemptSeed((s) => s + 1);
                                setQuizAnswers({});
                                setQuizSubmitted(false);
                                if (activeModule.quiz.length === 0) {
                                  markModuleCompletedInCloud(activeModule.id);
                                }
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                                quizUnlocked
                                  ? 'bg-emerald-600 text-white'
                                  : maxReachedSectionIndex >= activeModule.sections.length - 1
                                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  : 'bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed'
                              }`}
                            >
                              <span>Knowledge Check &amp; CPD</span>
                              {maxReachedSectionIndex >= activeModule.sections.length - 1 ||
                              quizUnlocked ? (
                                <Sparkles className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

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

                            {renderFormattedSectionContent(
                              activeModule.sections[activeSectionIndex]
                            )}

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                              <button
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
                                  onClick={() => {
                                    const nextIdx = activeSectionIndex + 1;
                                    setActiveSectionIndex(nextIdx);
                                    setMaxReachedSectionIndex((prev) =>
                                      Math.max(prev, nextIdx)
                                    );
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5"
                                >
                                  <span>Next Section</span>
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setQuizUnlocked(true);
                                    setQuizAttemptSeed((s) => s + 1);
                                    setQuizAnswers({});
                                    setQuizSubmitted(false);
                                    if (activeModule.quiz.length === 0) {
                                      markModuleCompletedInCloud(activeModule.id);
                                    }
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
                                onClick={() => setQuizUnlocked(false)}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                              >
                                Review Sections
                              </button>
                            </div>

                            {shuffledQuizQuestions.length === 0 ? (
                              <div className="space-y-4">
                                <p className="text-sm text-slate-600">
                                  Module completed! You can now generate your CPD Certificate.
                                </p>
                                <div className="flex flex-wrap items-center gap-2.5">
                                  <button
                                    onClick={() => setShowCpdModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold"
                                  >
                                    <Award className="w-4 h-4" />
                                    <span>Generate CPD Certificate</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openLockedFeedbackModal(activeModule.title)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold"
                                  >
                                    <MessageSquarePlus className="w-4 h-4 text-emerald-600" />
                                    <span>Optional Module Feedback</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                {shuffledQuizQuestions.map((qItem, qIdx) => (
                                  <div key={qIdx} className="space-y-3">
                                    <div className="font-bold text-sm sm:text-base text-slate-900">
                                      {qIdx + 1}. {qItem.q}
                                    </div>
                                    <div className="space-y-2">
                                      {qItem.options.map((opt, optIdx) => {
                                        const selected = quizAnswers[qIdx] === optIdx;
                                        const isCorrect = qItem.correct === optIdx;
                                        let btnStyle =
                                          'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100';
                                        if (selected) {
                                          btnStyle =
                                            'bg-slate-900 border-slate-900 text-white font-semibold';
                                        }
                                        if (quizSubmitted) {
                                          if (isCorrect) {
                                            btnStyle =
                                              'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
                                          } else if (selected && !isCorrect) {
                                            btnStyle =
                                              'bg-rose-50 border-rose-300 text-rose-900';
                                          }
                                        }
                                        return (
                                          <button
                                            key={optIdx}
                                            disabled={quizSubmitted}
                                            onClick={() =>
                                              setQuizAnswers((prev) => ({
                                                ...prev,
                                                [qIdx]: optIdx
                                              }))
                                            }
                                            className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition flex items-center justify-between ${btnStyle}`}
                                          >
                                            <span>{opt}</span>
                                            {quizSubmitted && isCorrect && (
                                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {quizSubmitted && qItem.explanation && (
                                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                                        <strong>Explanation:</strong> {qItem.explanation}
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {(() => {
                                  const correctCount = shuffledQuizQuestions.filter(
                                    (qItem, idx) => quizAnswers[idx] === qItem.correct
                                  ).length;
                                  const totalQuestions = shuffledQuizQuestions.length;
                                  const passed100 = correctCount === totalQuestions;

                                  return (
                                    <div className="pt-4 border-t border-slate-100 space-y-3">
                                      {quizSubmitted && (
                                        <div
                                          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between gap-2 ${
                                            passed100
                                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                              : 'bg-amber-50 border-amber-200 text-amber-950'
                                          }`}
                                        >
                                          <span>
                                            {passed100
                                              ? `✓ Score: ${correctCount}/${totalQuestions} (100%) — CPD Certificate unlocked!`
                                              : `Score: ${correctCount}/${totalQuestions} (${Math.round(
                                                  (correctCount / totalQuestions) * 100
                                                )}%) — 100% is required to unlock your CPD Certificate.`}
                                          </span>
                                        </div>
                                      )}

                                      <div className="flex flex-wrap items-center justify-between gap-3">
                                        {quizSubmitted ? (
                                          <>
                                            <div className="flex flex-wrap items-center gap-2">
                                              {passed100 ? (
                                                <button
                                                  type="button"
                                                  onClick={() => setShowCpdModal(true)}
                                                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-2xs"
                                                >
                                                  <Award className="w-4 h-4" />
                                                  <span>Generate CPD Certificate</span>
                                                </button>
                                              ) : (
                                                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                                                  <span>Achieve 100% to unlock certificate</span>
                                                </div>
                                              )}

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  openLockedFeedbackModal(activeModule.title)
                                                }
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                                              >
                                                <MessageSquarePlus className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>Module Feedback</span>
                                              </button>
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setQuizSubmitted(false);
                                                setQuizAnswers({});
                                                setQuizAttemptSeed((s) => s + 1);
                                              }}
                                              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs sm:text-sm font-semibold text-slate-700"
                                            >
                                              Retry Quiz
                                            </button>
                                          </>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setQuizSubmitted(true);
                                              if (passed100) {
                                                markModuleCompletedInCloud(activeModule.id);
                                              }
                                            }}
                                            className="ml-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold"
                                          >
                                            Check Answers
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Faculty Attribution & Evidence References Box */}
                        <div className="mt-5 bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setShowFacultyGovernanceBox((prev) => !prev)}
                            className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-slate-50 transition"
                          >
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>
                                Faculty Attribution, Peer Review &amp; Evidence References
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                              <span>{showFacultyGovernanceBox ? 'Hide' : 'Details'}</span>
                              {showFacultyGovernanceBox ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </div>
                          </button>

                          {showFacultyGovernanceBox && (
                            <div className="p-4 pt-3 border-t border-slate-100 bg-slate-50/70 space-y-2.5 text-xs text-slate-600">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                    Authoring Faculty
                                  </span>
                                  <strong className="text-slate-800">
                                    {activeModule.facultyName ||
                                      INITIAL_GOVERNANCE_META.clinicalLead}
                                  </strong>
                                  {activeModule.facultyCredentials && (
                                    <span className="block text-[11px] text-slate-500">
                                      {activeModule.facultyCredentials}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                    Peer Review &amp; Governance
                                  </span>
                                  <strong className="text-emerald-700">
                                    ✓ Peer Reviewed:{' '}
                                    {activeModule.peerReviewedDate ||
                                      INITIAL_GOVERNANCE_META.lastReviewed}
                                  </strong>
                                  <span className="block text-[11px] text-slate-500">
                                    {activeModule.coiDisclosure ||
                                      'No conflicts of interest declared.'}
                                  </span>
                                </div>
                              </div>

                              {Array.isArray(activeModule.references) &&
                                activeModule.references.length > 0 && (
                                  <div className="pt-2 border-t border-slate-200/70 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                      Supporting Clinical Guidelines
                                    </span>
                                    {activeModule.references.map((r, rIdx) => (
                                      <a
                                        key={rIdx}
                                        href={r.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between gap-2 text-emerald-700 hover:underline py-0.5"
                                      >
                                        <span>• {r.title}</span>
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 2B. INTERACTIVE PROCEDURE SIMULATOR (HANDS-ON PAINT / DRAW / ADVANCE / HOLD + LIVE TELEMETRY) */}
            {learningSectionTab === 'simulator' && activeSim && !simDisclaimerAccepted && (
              <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
                <div className="flex items-start gap-3.5 border-b border-slate-100 pb-4">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                      Mandatory Clinical &amp; Educational Declaration
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                      Before Entering Procedure Sim
                    </h2>
                  </div>
                </div>

                <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <p>
                    <strong>1. Purely Educational Purpose:</strong> This interactive procedure simulator is designed solely as a visual and cognitive familiarisation aid. It <strong>does not replace</strong> formal hands-on clinical training, manikin simulation, supervised practice, or airway competency sign-off.
                  </p>
                  <p>
                    <strong>2. Evolving Clinical Guidelines:</strong> Every effort has been made to ensure anatomical landmarks and procedural steps reflect current UK standards (DAS, NTSP &amp; Resuscitation Council UK) as accurately as possible; however, national and local protocols may be updated over time.
                  </p>
                  <p>
                    <strong>3. Real-World Emergency Practice:</strong> In a genuine clinical emergency, always assess the patient directly, check their individualised Bedhead Sign / care plan, and follow current local NHS Trust, JRCALC, and specialist airway guidelines.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSimDeclarationChecked((prev) => !prev)}
                  className={`w-full text-left p-4 rounded-2xl border transition flex items-start gap-3 ${
                    simDeclarationChecked
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 shrink-0 border transition ${
                      simDeclarationChecked
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    {simDeclarationChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold leading-snug">
                    I understand and agree that this simulator is purely educational, does not replace formal practical training, and that I will always verify and follow current local guidelines in a real emergency.
                  </span>
                </button>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={!simDeclarationChecked}
                    onClick={() => setSimDisclaimerAccepted(true)}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold shadow-2xs transition flex items-center gap-2"
                  >
                    <span>Acknowledge &amp; Enter Procedure Sim</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {learningSectionTab === 'simulator' && activeSim && simDisclaimerAccepted && (() => {
              const safeStepIndex = Math.min(
                simStepIndex,
                Math.max(0, visibleSimSteps.length - 1)
              );
              const currentSimStep =
                visibleSimSteps[safeStepIndex] || visibleSimSteps[0];

              const completedCount = visibleSimSteps.filter(
                (st) => !!simCompletedSteps[`${activeSim.id}-${st.id}`]
              ).length;
              const isStepDone =
                !!simCompletedSteps[`${activeSim.id}-${currentSimStep.id}`];

              const progressRatio =
                visibleSimSteps.length > 0
                  ? completedCount / visibleSimSteps.length
                  : 0;
              const isAirwaySecured =
                completedCount === visibleSimSteps.length &&
                visibleSimSteps.length > 0;
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

              const completeCurrentSimStep = () => {
                simDragActiveRef.current = false;
                simProgressRef.current = 100;
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
                const safeW = rect.width || 1;
                const safeH = rect.height || 1;
                return {
                  x: (localX / safeW) * 500,
                  y: (localY / safeH) * 340,
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
                if (simLiveAdvanceLineRef.current && currentSimStep?.dragStart) {
                  simLiveAdvanceLineRef.current.setAttribute('x2', String(currentSimStep.dragStart.x));
                  simLiveAdvanceLineRef.current.setAttribute('y2', String(currentSimStep.dragStart.y));
                }
                if (simLiveProgressTextRef.current) {
                  simLiveProgressTextRef.current.textContent = '0%';
                }
                setSimDragActive(false);
                setSimDragCurrent(null);
                setSimStrokePoints([]);
                setSimPaintedCells({});
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

              const recordPaintCoverageAt = (pt) => {
                const tz = currentSimStep.targetZone;
                const distToZone = Math.hypot(pt.x - tz.x, pt.y - tz.y);
                if (distToZone > tz.r + 12) return;

                const cellSize = 14;
                const gx = Math.floor((pt.x - (tz.x - tz.r)) / cellSize);
                const gy = Math.floor((pt.y - (tz.y - tz.r)) / cellSize);
                const cellKey = `${gx},${gy}`;

                if (simPaintedRef.current[cellKey]) return;
                simPaintedRef.current[cellKey] = true;

                const uniqueCellsCount = Object.keys(simPaintedRef.current).length;
                const requiredCells = Math.max(
                  14,
                  Math.round(((Math.PI * tz.r * tz.r) / (cellSize * cellSize)) * 0.68)
                );
                const rawPct = Math.min(
                  100,
                  Math.round((uniqueCellsCount / requiredCells) * 100)
                );
                const smoothPct = Math.min(
                  100,
                  Math.max(simProgressRef.current, Math.min(rawPct, simProgressRef.current + 12))
                );
                if (smoothPct !== simProgressRef.current) {
                  simProgressRef.current = smoothPct;
                  if (simLiveProgressTextRef.current) {
                    simLiveProgressTextRef.current.textContent = `${smoothPct}%`;
                  }
                  if (smoothPct >= 100) {
                    completeCurrentSimStep();
                  }
                }
              };

              const handleInteractivePointerDown = (e) => {
                if (e.currentTarget.setPointerCapture) {
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch (_) {
                    // ignore if unsupported
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
                  setSimFeedbackBanner({
                    type: 'warn',
                    text: `Select "${reqToolObj?.short || 'the required tool'}" from the Instrument Tray first.`
                  });
                  return;
                }

                const mode = currentSimStep.interactionType || 'tap';

                if (mode === 'tap') {
                  const dx = pt.x - currentSimStep.targetZone.x;
                  const dy = pt.y - currentSimStep.targetZone.y;
                  if (Math.hypot(dx, dy) <= currentSimStep.targetZone.r + 24) {
                    completeCurrentSimStep();
                  } else {
                    setSimFeedbackBanner({
                      type: 'warn',
                      text: `Aim closer to ${currentSimStep.targetZone.label}.`
                    });
                  }
                  return;
                }

                if (mode === 'hold') {
                  const dx = pt.x - currentSimStep.targetZone.x;
                  const dy = pt.y - currentSimStep.targetZone.y;
                  if (Math.hypot(dx, dy) <= currentSimStep.targetZone.r + 24) {
                    simDragActiveRef.current = true;
                    setSimDragActive(true);
                    const startPct = Math.max(simProgressRef.current, 10);
                    simProgressRef.current = startPct;
                    setSimActionProgress(startPct);
                  } else {
                    setSimFeedbackBanner({
                      type: 'warn',
                      text: `Press directly on ${currentSimStep.targetZone.label} and hold steady until 100%.`
                    });
                  }
                  return;
                }

                if (mode === 'paint') {
                  simDragActiveRef.current = true;
                  setSimDragActive(true);
                  simStrokeRef.current = [{ x: pt.x, y: pt.y }];
                  if (simLivePolylineRef.current) {
                    simLivePolylineRef.current.setAttribute('points', `${pt.x},${pt.y}`);
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
                    if (distFromStart > 30) {
                      setSimFeedbackBanner({
                        type: 'warn',
                        text: 'Start directly on the orange start dot and trace smoothly to the green end dot.'
                      });
                      return;
                    }
                  }
                  simDragActiveRef.current = true;
                  setSimDragActive(true);
                  simStrokeRef.current = [{ x: pt.x, y: pt.y }];
                  if (simLivePolylineRef.current) {
                    simLivePolylineRef.current.setAttribute('points', `${pt.x},${pt.y}`);
                  }
                  return;
                }

                if (mode === 'advance') {
                  const startPt = currentSimStep.dragStart || currentSimStep.targetZone;
                  const distFromStart = Math.hypot(pt.x - startPt.x, pt.y - startPt.y);
                  if (distFromStart <= 32) {
                    simDragActiveRef.current = true;
                    setSimDragActive(true);
                    simStrokeRef.current = [{ x: pt.x, y: pt.y }];
                  } else {
                    setSimFeedbackBanner({
                      type: 'warn',
                      text: `Start at the orange entry dot (${currentSimStep.targetZone.label}) and slide smoothly to the green depth marker.`
                    });
                  }
                }
              };

              const handleInteractivePointerMove = (e) => {
                const pt = getSvgPointFromClient(e.clientX, e.clientY);
                moveCursorOverlay(pt.localX, pt.localY, true);

                if (!simDragActiveRef.current || isStepDone) return;

                const mode = currentSimStep.interactionType || 'tap';
                if (simStrokeRef.current.length > 140) {
                  simStrokeRef.current.shift();
                }
                simStrokeRef.current.push({ x: pt.x, y: pt.y });

                if (simLivePolylineRef.current && (mode === 'paint' || mode === 'draw' || mode === 'drag')) {
                  simLivePolylineRef.current.setAttribute(
                    'points',
                    simStrokeRef.current.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
                  );
                }

                if (mode === 'paint') {
                  recordPaintCoverageAt(pt);
                  return;
                }

                if (mode === 'draw' || mode === 'drag') {
                  if (currentSimStep.dragStart && currentSimStep.dragEnd) {
                    const vx = currentSimStep.dragEnd.x - currentSimStep.dragStart.x;
                    const vy = currentSimStep.dragEnd.y - currentSimStep.dragStart.y;
                    const lenSq = vx * vx + vy * vy || 1;
                    const proj = Math.max(
                      0,
                      Math.min(
                        1,
                        ((pt.x - currentSimStep.dragStart.x) * vx +
                          (pt.y - currentSimStep.dragStart.y) * vy) /
                          lenSq
                      )
                    );
                    const rawPct = Math.round(proj * 100);
                    const nextPct = Math.min(
                      100,
                      Math.max(simProgressRef.current, Math.min(rawPct, simProgressRef.current + 18))
                    );
                    if (nextPct !== simProgressRef.current) {
                      simProgressRef.current = nextPct;
                      if (simLiveProgressTextRef.current) {
                        simLiveProgressTextRef.current.textContent = `${nextPct}%`;
                      }
                      if (nextPct >= 96) {
                        setSimStrokePoints([...simStrokeRef.current]);
                        completeCurrentSimStep();
                      }
                    }
                  }
                  return;
                }

                if (mode === 'advance') {
                  const startPt = currentSimStep.dragStart || currentSimStep.targetZone;
                  const endPt = currentSimStep.dragEnd || {
                    x: startPt.x,
                    y: startPt.y + 65
                  };
                  const vx = endPt.x - startPt.x;
                  const vy = endPt.y - startPt.y;
                  const lenSq = vx * vx + vy * vy || 1;
                  const proj = Math.max(
                    0,
                    Math.min(
                      1,
                      ((pt.x - startPt.x) * vx + (pt.y - startPt.y) * vy) / lenSq
                    )
                  );
                  const rawPct = Math.round(proj * 100);
                  const nextPct = Math.min(
                    100,
                    Math.max(simProgressRef.current, Math.min(rawPct, simProgressRef.current + 18))
                  );
                  if (nextPct !== simProgressRef.current) {
                    simProgressRef.current = nextPct;
                    if (simLiveProgressTextRef.current) {
                      simLiveProgressTextRef.current.textContent = `${nextPct}%`;
                    }
                    if (simLiveAdvanceLineRef.current) {
                      const curX = startPt.x + ((endPt.x - startPt.x) * nextPct) / 100;
                      const curY = startPt.y + ((endPt.y - startPt.y) * nextPct) / 100;
                      simLiveAdvanceLineRef.current.setAttribute('x2', curX.toFixed(1));
                      simLiveAdvanceLineRef.current.setAttribute('y2', curY.toFixed(1));
                      simLiveAdvanceLineRef.current.setAttribute('opacity', '1');
                    }
                    if (nextPct >= 96) {
                      completeCurrentSimStep();
                    }
                  }
                }
              };

              const handleInteractivePointerUp = (e) => {
                if (e?.currentTarget?.releasePointerCapture && e?.pointerId !== undefined) {
                  try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  } catch (_) {
                    // ignore if not captured
                  }
                }
                if (simDragActiveRef.current) {
                  simDragActiveRef.current = false;
                  setSimDragActive(false);
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
                setSelectedSimTool(visibleSimSteps[0]?.requiredTool || 'tool-hands');
                setSimFeedbackBanner(null);
                setSimShowMeHint(false);
                setSimStrokePoints([]);
                setSimPaintedCells({});
                setSimActionProgress(0);
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
                            setSimStrokePoints([]);
                            setSimPaintedCells({});
                            setSimActionProgress(0);
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

                  {/* Header + Mode Switcher & Age Switcher */}
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

                      {activeSim.diagramType !== 'custom-image' && (
                        <button
                          type="button"
                          onClick={() => setShowSimLabels((p) => !p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
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
                            <strong>Infant (&lt;1 yr) Pathway Active ({visibleSimSteps.length} steps):</strong> The cricothyroid membrane is ~2–3 mm and the cricoid ring is the narrowest point. Steps are tailored to <strong>45° caudal needle cricothyroidotomy</strong> with low-pressure oxygenation.
                          </span>
                        )}
                        {simAgeGroup === 'child' && (
                          <span>
                            <strong>Child (2–6 yrs) Pathway Active ({visibleSimSteps.length} steps):</strong> DAS Paediatric CICO guidelines recommend <strong>45° caudal needle cricothyroidotomy</strong> as first-line rescue in children under 8–10 years.
                          </span>
                        )}
                        {simAgeGroup === 'adolescent' && (
                          <span>
                            <strong>Adolescent (&gt;10 yrs) Pathway Active ({visibleSimSteps.length} steps):</strong> The cricothyroid membrane approaches adult dimensions; steps switch automatically to <strong>Surgical Scalpel–Bougie–Tube</strong> rescue.
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
                              <h3 className="text-base font-bold text-slate-900">
                                {st.title}
                              </h3>
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
                                  setSimStrokePoints([]);
                                  setSimPaintedCells({});
                                  setSimActionProgress(0);
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
                    /* INTERACTIVE PRACTICE MODE */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
                                        setSimStrokePoints([]);
                                        setSimPaintedCells({});
                                        setSimActionProgress(0);
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
                                    monitorSpo2 >= 94
                                      ? 'text-emerald-400'
                                      : 'text-rose-400'
                                  }`}
                                >
                                  {monitorSpo2}%
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 mr-1">HR:</span>
                                <span
                                  className={`font-bold ${
                                    monitorHr >= 80
                                      ? 'text-emerald-400'
                                      : 'text-amber-400'
                                  }`}
                                >
                                  {monitorHr} bpm
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 mr-1">EtCO2:</span>
                                <span
                                  className={`font-bold ${
                                    isAirwaySecured
                                      ? 'text-sky-400'
                                      : 'text-amber-400'
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

                          {/* Side-by-Side Workspace: Interactive Anatomical Diagram (Left) + Instrument Tray (Side) */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                            {/* Interactive Anatomical Canvas + Action Buttons Underneath */}
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
                                    <linearGradient id="cartilageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                      <stop offset="0%" stopColor="#f1f5f9" />
                                      <stop offset="100%" stopColor="#cbd5e1" />
                                    </linearGradient>
                                    <linearGradient id="ctmMembraneGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                      <stop offset="0%" stopColor="#fb7185" />
                                      <stop offset="50%" stopColor="#fda4af" />
                                      <stop offset="100%" stopColor="#fb7185" />
                                    </linearGradient>
                                    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                                      <feGaussianBlur stdDeviation="3" result="blur" />
                                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
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
                                      <rect
                                        x="180"
                                        y="150"
                                        width="60"
                                        height="28"
                                        fill="#172033"
                                      />
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
                                          <text x="50" y="168" fill="#f8fafc">
                                            Anterior Neck Stoma
                                          </text>
                                          <text x="36" y="255" fill="#fda4af">
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
                                      <path
                                        d="M 195 318 Q 250 292 305 318"
                                        fill="none"
                                        stroke="#b87a5e"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                      />

                                      {simCompletedSteps[`${activeSim.id}-cric-2`] && (
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
                                            y2="232"
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
                                      {simCompletedSteps[`${activeSim.id}-cric-5`] && (
                                        <line
                                          x1="230"
                                          y1="182"
                                          x2="270"
                                          y2="182"
                                          stroke="#9f1239"
                                          strokeWidth="4.5"
                                          strokeLinecap="round"
                                        />
                                      )}
                                      {simCompletedSteps[`${activeSim.id}-cric-6`] && (
                                        <path
                                          d="M 250 182 L 250 272"
                                          stroke="#0284c7"
                                          strokeWidth="5"
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
                                          <text x="370" y="186" fill="#fda4af">Cricothyroid Membrane</text>

                                          <line x1="282" y1="200" x2="365" y2="220" stroke="#94a3b8" strokeWidth="1.2" />
                                          <text x="370" y="224" fill="#f1f5f9">Cricoid Cartilage</text>

                                          <line x1="276" y1="250" x2="365" y2="262" stroke="#94a3b8" strokeWidth="1.2" />
                                          <text x="370" y="266" fill="#cbd5e1">Tracheal Rings</text>

                                          <text x="250" y="330" textAnchor="middle" fill="#94a3b8" fontSize="10">
                                            Suprasternal Notch
                                          </text>
                                        </g>
                                      )}
                                    </>
                                  )}

                                  {/* Zero-Lag Direct DOM Polyline for Paint & Draw Strokes */}
                                  <polyline
                                    ref={simLivePolylineRef}
                                    points={simStrokePoints
                                      .map((p) => `${p.x},${p.y}`)
                                      .join(' ')}
                                    fill="none"
                                    stroke={
                                      currentSimStep.interactionType === 'paint'
                                        ? 'rgba(244, 63, 94, 0.45)'
                                        : selectedSimTool.includes('scalpel')
                                        ? '#e11d48'
                                        : '#2563eb'
                                    }
                                    strokeWidth={
                                      currentSimStep.interactionType === 'paint' ? '26' : '4.5'
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
                                          stroke="rgba(56, 189, 248, 0.3)"
                                          strokeWidth="12"
                                          strokeLinecap="round"
                                        />
                                        <line
                                          ref={simLiveAdvanceLineRef}
                                          x1={currentSimStep.dragStart.x}
                                          y1={currentSimStep.dragStart.y}
                                          x2={
                                            currentSimStep.dragStart.x +
                                            ((currentSimStep.dragEnd.x -
                                              currentSimStep.dragStart.x) *
                                              simActionProgress) /
                                              100
                                          }
                                          y2={
                                            currentSimStep.dragStart.y +
                                            ((currentSimStep.dragEnd.y -
                                              currentSimStep.dragStart.y) *
                                              simActionProgress) /
                                              100
                                          }
                                          stroke="#0ea5e9"
                                          strokeWidth="10"
                                          strokeLinecap="round"
                                          opacity={simActionProgress > 0 ? '1' : '0'}
                                        />
                                      </g>
                                    )}

                                  {/* Guide Arrow for Draw & Advance Steps */}
                                  {(currentSimStep.interactionType === 'draw' ||
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
                                </svg>

                                {/* GPU-Accelerated Floating Tool Cursor (Zero React Re-renders on Move) */}
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
                                    {renderSvgCanvasToolCursor(
                                      selectedSimTool,
                                      activeToolObj?.short
                                    )}
                                  </svg>
                                </div>
                              </div>

                              {/* Full Unclipped Guidance Pill + Percentage & Action Buttons */}
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
                                      title="Reset Current Step"
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

                            {/* Draggable Instrument & Airway Tray (On the Side) */}
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

                              <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80 text-[11px] text-indigo-950 leading-relaxed">
                                <strong>{activeToolObj.name}:</strong> {activeToolObj.desc}
                              </div>
                            </div>
                          </div>
                        </div>

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

        {/* ==========================================
            3. ADMIN CMS
            ========================================== */}
        {appMode === 'admin' && !isAdminAuthenticated && (
          <div className="max-w-md mx-auto my-8">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Clinical Admin Sign In
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Encrypted Firebase Authentication for clinical editors.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Work Email Address
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={loginEmailInput}
                    onChange={(e) => {
                      setLoginEmailInput(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="name@nhs.net"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPasswordInput}
                    onChange={(e) => {
                      setLoginPasswordInput(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                  {loginError && (
                    <p className="text-xs font-semibold text-rose-600 mt-1.5">
                      {loginError}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAppMode('oncall')}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold shadow-2xs inline-flex items-center gap-1.5"
                  >
                    {authLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{authLoading ? 'Signing In...' : 'Sign In'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {appMode === 'admin' && isAdminAuthenticated && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Admin Content Manager
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Cloud className="w-3 h-3" /> Live Cloud Sync
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Signed in as <strong>{currentAdminUser.name}</strong> ({currentAdminUser.role})
                  {lastCloudSyncAt && (
                    <span> • Last cloud sync at {lastCloudSyncAt} by {lastUpdatedBy}</span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap">
                  <button
                    onClick={() => setAdminTab('pathways')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      adminTab === 'pathways'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pathways
                  </button>
                  <button
                    onClick={() => setAdminTab('modules')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      adminTab === 'modules'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Modules
                  </button>
                  <button
                    onClick={() => {
                      resetHardwareForm();
                      setAdminTab('hardware');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      adminTab === 'hardware'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tube ID
                  </button>
                  <button
                    onClick={() => setAdminTab('sims')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      adminTab === 'sims'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Procedure Sims
                  </button>
                  <button
                    onClick={() => {
                      setOwnProfileForm({
                        name: currentAdminUser.name || '',
                        email: currentAdminUser.email || '',
                        newPassword: ''
                      });
                      setAdminTab('profile');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                      adminTab === 'profile'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Profile</span>
                  </button>
                  {isSuperAdmin && (
                    <button
                      onClick={() => setAdminTab('team')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                        adminTab === 'team'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Team ({adminUsers.length})</span>
                    </button>
                  )}
                  {isSuperAdmin && (
                    <button
                      onClick={() => setAdminTab('publish')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                        adminTab === 'publish'
                          ? 'bg-white text-emerald-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Cloud &amp; Feedback</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={handleAdminLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {cmsNotification && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between">
                <span>✓ {cmsNotification}</span>
                <button onClick={() => setCmsNotification(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* FULL VISUAL PROCEDURE SIM DESIGNER IN ADMIN */}
            {adminTab === 'sims' && adminSim && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {procedureSims.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setAdminSimId(s.id);
                          setEditingSimStepIdx(0);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                          adminSim.id === s.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {s.title}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowNewSimModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ New Procedure Sim</span>
                  </button>
                </div>

                {/* Simulation Title, Subtitle & Diagram Uploader Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-900">
                      Simulation Overview &amp; Custom Drawn Diagram
                    </h2>
                    {procedureSims.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSim(adminSim.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Sim</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Simulation Title
                      </label>
                      <input
                        type="text"
                        value={adminSim.title}
                        onChange={(e) =>
                          handleUpdateAdminSimMeta('title', e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subtitle / Clinical Context
                      </label>
                      <input
                        type="text"
                        value={adminSim.subtitle}
                        onChange={(e) =>
                          handleUpdateAdminSimMeta('subtitle', e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Anatomical Diagram (Upload Your Drawn Image or Paste URL)
                      </span>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingSimDiagram ? 'Uploading...' : 'Upload Drawn Diagram'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingSimDiagram}
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleUploadSimDiagramFile(e.target.files[0]);
                              e.target.value = '';
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <input
                      type="text"
                      value={adminSim.customDiagramUrl || ''}
                      onChange={(e) =>
                        handleUpdateAdminSimMeta('customDiagramUrl', e.target.value)
                      }
                      placeholder="Paste image URL (or leave blank to use built-in vector diagram)"
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Steps List + Add Step + Step Editor */}
                  <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 space-y-4 self-start">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-900">
                        Procedure Steps ({adminSim.steps.length})
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddSimStep}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Step</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {adminSim.steps.map((st, idx) => (
                        <div
                          key={st.id}
                          className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 transition ${
                            editingSimStepIdx === idx
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setEditingSimStepIdx(idx)}
                            className="text-left truncate flex-1"
                          >
                            {idx + 1}. {st.title}
                          </button>
                          {adminSim.steps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSimStep(idx)}
                              className="text-slate-400 hover:text-rose-600 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {currentAdminSimStep && (
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                          Editing Step {editingSimStepIdx + 1} Details
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Step Title
                          </label>
                          <input
                            type="text"
                            value={currentAdminSimStep.title}
                            onChange={(e) =>
                              handleUpdateSimStepField('title', e.target.value)
                            }
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Required Instrument
                            </label>
                            <select
                              value={currentAdminSimStep.requiredTool}
                              onChange={(e) =>
                                handleUpdateSimStepField('requiredTool', e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold"
                            >
                              {adminSim.tools.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.short} ({t.name})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Gesture Type
                            </label>
                            <select
                              value={currentAdminSimStep.interactionType}
                              onChange={(e) =>
                                handleUpdateSimStepField(
                                  'interactionType',
                                  e.target.value
                                )
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold"
                            >
                              <option value="paint">Scrub / Coat Area</option>
                              <option value="draw">Trace / Incise Line</option>
                              <option value="advance">Push / Advance Tube</option>
                              <option value="hold">Press &amp; Hold</option>
                              <option value="tap">Tap Target</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Clinician Instruction
                          </label>
                          <textarea
                            rows={2}
                            value={currentAdminSimStep.instruction}
                            onChange={(e) =>
                              handleUpdateSimStepField('instruction', e.target.value)
                            }
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            ENT / Surgical Pearl
                          </label>
                          <textarea
                            rows={2}
                            value={currentAdminSimStep.traineeTip}
                            onChange={(e) =>
                              handleUpdateSimStepField('traineeTip', e.target.value)
                            }
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Interactive Click-to-Place Hotspot Canvas */}
                  <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-900">
                        Tap Anywhere on Diagram to Place Step {editingSimStepIdx + 1} Target
                      </h3>
                      <span className="text-xs text-emerald-700 font-semibold">
                        Auto-syncs to Cloud
                      </span>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
                      <svg
                        viewBox="0 0 500 340"
                        onClick={handleSetHotspotByClick}
                        className="w-full h-auto max-h-[380px] cursor-crosshair block"
                      >
                        {adminSim.diagramType === 'custom-image' &&
                        adminSim.customDiagramUrl ? (
                          <image
                            href={adminSim.customDiagramUrl}
                            x="0"
                            y="0"
                            width="500"
                            height="340"
                            preserveAspectRatio="xMidYMid meet"
                          />
                        ) : adminSim.diagramType === 'builtin-sagittal' ? (
                          <>
                            <rect x="0" y="0" width="500" height="340" fill="#0f172a" />
                            <path
                              d="M 155 25 L 185 135 L 185 195 L 155 315 L 220 315 L 220 25 Z"
                              fill="#f6cdb8"
                              stroke="#d69e82"
                              strokeWidth="2"
                            />
                            <rect
                              x="232"
                              y="25"
                              width="66"
                              height="290"
                              rx="12"
                              fill="#1e293b"
                              stroke="#38bdf8"
                              strokeWidth="2.5"
                            />
                          </>
                        ) : (
                          <>
                            <path
                              d="M 140 20 Q 250 75 360 20 L 385 320 L 115 320 Z"
                              fill="#f6cdb8"
                              stroke="#d69e82"
                              strokeWidth="2.5"
                            />
                            <rect
                              x="227"
                              y="173"
                              width="46"
                              height="18"
                              rx="5"
                              fill="#fda4af"
                              stroke="#e11d48"
                              strokeWidth="2"
                            />
                          </>
                        )}
                        {currentAdminSimStep && (
                          <circle
                            cx={currentAdminSimStep.targetZone.x}
                            cy={currentAdminSimStep.targetZone.y}
                            r={currentAdminSimStep.targetZone.r}
                            fill="rgba(16, 185, 129, 0.35)"
                            stroke="#10b981"
                            strokeWidth="3"
                          />
                        )}
                      </svg>
                    </div>
                    <p className="text-xs text-slate-500">
                      Tip: Draw your anatomical diagram on an iPad or computer, upload it above, then click on each anatomical landmark for each step to position the interactive target circle.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* MY PROFILE TAB */}
            {adminTab === 'profile' && (
              <div className="max-w-xl mx-auto">
                <form
                  onSubmit={handleUpdateOwnProfile}
                  className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4"
                >
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-emerald-600" />
                      <span>Edit My Admin Profile &amp; Password</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Passwords are encrypted by Google Firebase Authentication and never stored in plain text.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      My Role (Managed by Super Admin)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentAdminUser.role}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Login Email Address (Read-Only)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={ownProfileForm.email}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name &amp; Clinical Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={ownProfileForm.name}
                      onChange={(e) =>
                        setOwnProfileForm({ ...ownProfileForm, name: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Change Password (Leave blank to keep current password)
                    </label>
                    <input
                      type="password"
                      value={ownProfileForm.newPassword}
                      onChange={(e) =>
                        setOwnProfileForm({
                          ...ownProfileForm,
                          newPassword: e.target.value
                        })
                      }
                      placeholder="New password (min 6 characters)"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-2xs"
                    >
                      Save My Details &amp; Sync
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TEAM MANAGEMENT TAB */}
            {adminTab === 'team' && isSuperAdmin && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>Authorised Clinical Admin Team ({adminUsers.length})</span>
                      </h2>
                      <p className="text-xs text-slate-500">
                        All listed team members can log in from any computer or phone and publish updates to the cloud.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {adminUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {u.name}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold">
                              {u.role}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {u.email} • Added {u.addedAt}
                          </div>
                        </div>

                        {adminUsers.length > 1 && (
                          <button
                            onClick={() => handleRemoveAdminUser(u.id)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      <span>Recent Cloud Governance Audit Log</span>
                    </h3>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="text-xs p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/60 flex items-center justify-between gap-2"
                        >
                          <span className="text-slate-700">
                            <strong>{log.actor}:</strong> {log.action}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {log.timestamp}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={handleAddAdminTeamMember}
                  className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4 self-start"
                >
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span>Add Admin Team Member</span>
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name &amp; Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newAdminForm.name}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, name: e.target.value })
                      }
                      placeholder="e.g., Sarah Jenkins (Specialist Paramedic)"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Work Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={newAdminForm.email}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, email: e.target.value })
                      }
                      placeholder="e.g., s.jenkins@nhs.net"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Governance Role
                    </label>
                    <select
                      value={newAdminForm.role}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, role: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
                    >
                      <option value="Clinical Lead (Super Admin)">
                        Clinical Lead (Super Admin)
                      </option>
                      <option value="Content Editor">Content Editor</option>
                      <option value="Clinical Reviewer">Clinical Reviewer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assign Initial Password (min 6 characters) *
                    </label>
                    <input
                      type="password"
                      required
                      value={newAdminForm.password}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, password: e.target.value })
                      }
                      placeholder="Encrypted via Firebase Auth"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold shadow-2xs inline-flex items-center justify-center gap-1.5"
                  >
                    {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>
                      {authLoading
                        ? 'Provisioning Firebase Account...'
                        : '+ Create Login & Sync to Firestore'}
                    </span>
                  </button>
                </form>
              </div>
            )}

            {adminTab === 'publish' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquarePlus className="w-4 h-4 text-emerald-600" />
                        <span>
                          Learner Course Feedback Log ({feedbackLogs.length} entries)
                        </span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Anonymous evaluation scores (Relevance, Educational Quality &amp; Learning Objectives) ready for ENT UK 3-month quality review.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportFeedbackCsv}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Feedback CSV</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {feedbackLogs.map((fb) => (
                      <div
                        key={fb.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900">
                            {fb.moduleTitle}{' '}
                            <span className="font-normal text-slate-400">
                              ({fb.submittedAt})
                            </span>
                          </div>
                          {fb.comments && (
                            <p className="text-slate-600 italic">&ldquo;{fb.comments}&rdquo;</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0 font-semibold">
                          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                            Rel: {fb.relevanceRating}/5
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                            Qual: {fb.qualityRating}/5
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                            Obj: {fb.objectivesRating || fb.overallRating}/5
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                            Overall: {fb.overallRating}/5
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-5">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900">
                          Go-Live Website Launch Wizard
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500">
                          Follow these 3 steps to make your app a public website that paramedics can save to their phone home screen and embed on Google Sites.
                        </p>
                      </div>
                    </div>
                  </div>

                  <form
                    onSubmit={handleSaveCustomFirebaseConfig}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-emerald-600" />
                        <span>
                          Connect Your Own Firebase Cloud Config (Optional for External Hosting)
                        </span>
                      </label>
                      <span className="text-[11px] text-slate-500">
                        {cloudStatus === 'synced' ? '✓ Connected to Cloud' : 'Using Local Fallback'}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={customFirebaseJsonInput}
                      onChange={(e) => setCustomFirebaseJsonInput(e.target.value)}
                      placeholder='{"apiKey": "AIza...", "authDomain": "your-app.firebaseapp.com", "projectId": "your-app", "storageBucket": "...", "messagingSenderId": "...", "appId": "..."}'
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                      >
                        Save Firebase Config
                      </button>
                    </div>
                  </form>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadBackupJson}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Cloud Backup (.JSON)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyJsonToClipboard}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Content JSON</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadStandaloneWebsite}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold hover:bg-emerald-100"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Export Summary HTML</span>
                      </button>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={handleImportBackupJson}
                  className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3"
                >
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>Restore Cloud Content from JSON Backup</span>
                  </h3>
                  <textarea
                    rows={3}
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    placeholder='{"pathways": [...], "learningModules": [...]}'
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleResetFactoryData}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Cloud to Factory NTSP Defaults</span>
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      Restore &amp; Sync to Cloud
                    </button>
                  </div>
                </form>
              </div>
            )}

            {adminTab === 'pathways' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {pathways.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setAdminPathwayId(p.id);
                          resetAdminForm();
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                          adminPathwayId === p.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{p.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            adminPathwayId === p.id
                              ? 'bg-slate-700 text-slate-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.category === 'extra' ? 'Extra' : 'Core'}
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowNewPathwayModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>+ Create New Pathway</span>
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {adminPathway.title}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {adminPathway.category === 'extra'
                          ? 'Extra / Routine Pathway'
                          : 'Core Emergency Pathway'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {adminPathway.subtitle}
                    </p>
                  </div>

                  {pathways.length > 1 && (
                    <button
                      onClick={() => handleDeletePathway(adminPathway.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Pathway</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3 self-start">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h2 className="text-sm font-bold text-slate-900">
                        Steps in Pathway ({adminPathway.nodes.length})
                      </h2>
                      <button
                        onClick={resetAdminForm}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Step</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                      {adminPathway.nodes.map((node) => {
                        const yesTarget = adminPathway.nodes.find((n) => n.id === node.yesId);
                        const noTarget = adminPathway.nodes.find((n) => n.id === node.noId);
                        const nextTarget = adminPathway.nodes.find((n) => n.id === node.nextId);

                        return (
                          <div
                            key={node.id}
                            className={`p-3 rounded-xl border transition flex items-start justify-between gap-2 ${
                              editingNodeId === node.id
                                ? 'bg-emerald-50/50 border-emerald-400'
                                : 'bg-slate-50/60 border-slate-200/80'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="text-xs sm:text-sm font-semibold text-slate-900">
                                {cleanStepTitle(node.title)}
                              </div>
                              <div className="text-[11px] text-slate-500 flex flex-col gap-0.5">
                                {yesTarget && (
                                  <span className="text-emerald-700">
                                    Yes → {cleanStepTitle(yesTarget.title)}
                                  </span>
                                )}
                                {noTarget && (
                                  <span className="text-rose-700">
                                    No → {cleanStepTitle(noTarget.title)}
                                  </span>
                                )}
                                {nextTarget && !yesTarget && (
                                  <span className="text-slate-600">
                                    Next → {cleanStepTitle(nextTarget.title)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => loadNodeIntoForm(node)}
                                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAdminNode(node.id)}
                                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <form
                    onSubmit={handleSaveAdminNode}
                    className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4"
                  >
                    <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                      {editingNodeId ? 'Edit Step' : 'Add a New Step'}
                    </h2>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Step Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={newNodeForm.title}
                        onChange={(e) =>
                          setNewNodeForm({ ...newNodeForm, title: e.target.value })
                        }
                        placeholder="e.g., Assess Tracheostomy Tube Patency"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Brief Summary (1 line)
                      </label>
                      <input
                        type="text"
                        value={newNodeForm.subtitle}
                        onChange={(e) =>
                          setNewNodeForm({ ...newNodeForm, subtitle: e.target.value })
                        }
                        placeholder="e.g., Pass a flexible suction catheter to rule out blockage"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Checklist Points (One per line)
                      </label>
                      <textarea
                        rows={4}
                        value={newNodeForm.checklistText}
                        onChange={(e) =>
                          setNewNodeForm({ ...newNodeForm, checklistText: e.target.value })
                        }
                        placeholder={`Remove speaking valve or cap\nLook, listen, and feel at mouth and tracheostomy\nPass flexible suction catheter`}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Clinical Caution Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={newNodeForm.criticalNote}
                        onChange={(e) =>
                          setNewNodeForm({ ...newNodeForm, criticalNote: e.target.value })
                        }
                        placeholder="e.g., Never use a rigid Yankauer sucker inside the tube"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="text-xs font-bold text-slate-800">
                        Decision Question &amp; Next Step Links
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Question at bottom of card (Optional)
                        </label>
                        <input
                          type="text"
                          value={newNodeForm.question}
                          onChange={(e) =>
                            setNewNodeForm({ ...newNodeForm, question: e.target.value })
                          }
                          placeholder="e.g., Does the suction catheter pass easily?"
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm text-slate-900"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-emerald-700 mb-1">
                            If "Yes" → Go to Step:
                          </label>
                          <select
                            value={newNodeForm.yesId}
                            onChange={(e) =>
                              setNewNodeForm({ ...newNodeForm, yesId: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900"
                          >
                            <option value="">— None —</option>
                            {adminPathway.nodes.map((n) => (
                              <option key={n.id} value={n.id}>
                                {cleanStepTitle(n.title)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-rose-700 mb-1">
                            If "No" → Go to Step:
                          </label>
                          <select
                            value={newNodeForm.noId}
                            onChange={(e) =>
                              setNewNodeForm({ ...newNodeForm, noId: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900"
                          >
                            <option value="">— None —</option>
                            {adminPathway.nodes.map((n) => (
                              <option key={n.id} value={n.id}>
                                {cleanStepTitle(n.title)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Or Single "Continue" Step (if not a Yes/No question):
                        </label>
                        <select
                          value={newNodeForm.nextId}
                          onChange={(e) =>
                            setNewNodeForm({ ...newNodeForm, nextId: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900"
                        >
                          <option value="">— End of Pathway —</option>
                          {adminPathway.nodes.map((n) => (
                            <option key={n.id} value={n.id}>
                              {cleanStepTitle(n.title)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      {editingNodeId && (
                        <button
                          type="button"
                          onClick={resetAdminForm}
                          className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm"
                      >
                        {editingNodeId ? 'Update Step & Sync' : 'Save Step & Sync'}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>
                        Bottom Guideline &amp; NICE Reference Links for "{adminPathway.title}" (
                        {(adminPathway.references || []).length})
                      </span>
                    </h3>
                  </div>

                  {(adminPathway.references || []).length > 0 && (
                    <div className="space-y-2">
                      {(adminPathway.references || []).map((ref) => (
                        <div
                          key={ref.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="truncate">
                            <span className="font-bold text-slate-900">{ref.title}</span>
                            <span className="text-slate-500 ml-1.5">({ref.source})</span>
                            <div className="text-[11px] text-emerald-700 truncate mt-0.5">
                              {ref.url}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteReferenceFromPathway(ref.id)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={handleAddReferenceToPathway}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1"
                  >
                    <input
                      type="text"
                      required
                      value={newRefDraft.title}
                      onChange={(e) =>
                        setNewRefDraft({ ...newRefDraft, title: e.target.value })
                      }
                      placeholder="Guideline Title (e.g., NICE NG143 Paediatric Airway)"
                      className="sm:col-span-4 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                    <input
                      type="text"
                      value={newRefDraft.source}
                      onChange={(e) =>
                        setNewRefDraft({ ...newRefDraft, source: e.target.value })
                      }
                      placeholder="Organization (e.g., NICE / NTSP / JRCALC)"
                      className="sm:col-span-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                    <input
                      type="url"
                      required
                      value={newRefDraft.url}
                      onChange={(e) =>
                        setNewRefDraft({ ...newRefDraft, url: e.target.value })
                      }
                      placeholder="https://www.nice.org.uk/..."
                      className="sm:col-span-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                    <button
                      type="submit"
                      className="sm:col-span-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      + Add Link
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TUBE ID HARDWARE GALLERY ADMIN EDITOR */}
            {adminTab === 'hardware' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 space-y-3 self-start">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-900">
                      Tube &amp; Valve Items ({tubeHardwareList.length})
                    </h2>
                    <button
                      type="button"
                      onClick={resetHardwareForm}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Item</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {tubeHardwareList.map((hw) => (
                      <div
                        key={hw.id}
                        className={`p-3 rounded-xl border transition flex items-start justify-between gap-2.5 ${
                          editingHardwareId === hw.id
                            ? 'bg-emerald-50/50 border-emerald-400'
                            : 'bg-slate-50/60 border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          {hw.imageUrl ? (
                            <img
                              src={hw.imageUrl}
                              alt={hw.name}
                              className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-200/70 flex items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {hw.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {hw.tag}
                            </div>
                            <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                              {hw.imageUrl ? '✓ Photo attached' : 'No photo yet'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => loadHardwareIntoForm(hw)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {tubeHardwareList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteHardwareItem(hw.id)}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <form
                  onSubmit={handleSaveHardwareItem}
                  className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4"
                >
                  <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                    {editingHardwareId
                      ? 'Edit Tube / Hardware Item & Photo'
                      : 'Add New Tube / Valve to Tube ID'}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tube / Attachment Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={hardwareForm.name}
                        onChange={(e) =>
                          setHardwareForm({ ...hardwareForm, name: e.target.value })
                        }
                        placeholder="e.g., Bivona TTS Sterile-Water Cuffed"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Highlight Badge Label
                      </label>
                      <input
                        type="text"
                        value={hardwareForm.tag}
                        onChange={(e) =>
                          setHardwareForm({ ...hardwareForm, tag: e.target.value })
                        }
                        placeholder="e.g., Sterile-Water Cuff"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        <span>Reference Photo (Appears in Tube ID)</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingHardwarePhoto ? 'Uploading...' : 'Upload Photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingHardwarePhoto}
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleUploadHardwareImageFile(e.target.files[0]);
                              e.target.value = '';
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <input
                      type="text"
                      value={hardwareForm.imageUrl}
                      onChange={(e) =>
                        setHardwareForm({ ...hardwareForm, imageUrl: e.target.value })
                      }
                      placeholder="Or paste direct image URL (https://...)"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs"
                    />

                    {hardwareForm.imageUrl && (
                      <div className="flex items-start gap-3 pt-1">
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white max-w-[220px] shrink-0">
                          <img
                            src={hardwareForm.imageUrl}
                            alt="Preview"
                            className="w-full h-auto block"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setHardwareForm({ ...hardwareForm, imageUrl: '' })
                          }
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold"
                        >
                          Remove Photo
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cuff / Valve Type
                      </label>
                      <input
                        type="text"
                        value={hardwareForm.cuffType}
                        onChange={(e) =>
                          setHardwareForm({ ...hardwareForm, cuffType: e.target.value })
                        }
                        placeholder="e.g., Uncuffed (No pilot balloon)"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Inner Cannula Status
                      </label>
                      <input
                        type="text"
                        value={hardwareForm.innerCannula}
                        onChange={(e) =>
                          setHardwareForm({
                            ...hardwareForm,
                            innerCannula: e.target.value
                          })
                        }
                        placeholder="e.g., None (Single-lumen)"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Key Visual Identification Cue
                    </label>
                    <input
                      type="text"
                      value={hardwareForm.keyVisualCue}
                      onChange={(e) =>
                        setHardwareForm({
                          ...hardwareForm,
                          keyVisualCue: e.target.value
                        })
                      }
                      placeholder="e.g., Clear pilot balloon with white inflation valve..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Emergency Roadside Action
                    </label>
                    <input
                      type="text"
                      value={hardwareForm.emergencyAction}
                      onChange={(e) =>
                        setHardwareForm({
                          ...hardwareForm,
                          emergencyAction: e.target.value
                        })
                      }
                      placeholder="e.g., Aspirate pilot balloon completely before removing tube..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    {editingHardwareId && (
                      <button
                        type="button"
                        onClick={resetHardwareForm}
                        className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold"
                    >
                      {editingHardwareId ? 'Update Tube Item & Sync' : 'Save Tube Item & Sync'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ENHANCED LEARNING MODULES EDITOR */}
            {adminTab === 'modules' && adminModule && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {learningModules.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setAdminModuleId(m.id);
                          resetSectionForm();
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                          adminModuleId === m.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {m.title}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowNewModuleModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ New Learning Module</span>
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-900">
                      Module Overview, Faculty Attribution &amp; Learning Objectives
                    </h2>
                    {learningModules.length > 1 && (
                      <button
                        onClick={() => handleDeleteModule(adminModule.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Module</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Module Title
                      </label>
                      <input
                        type="text"
                        value={adminModule.title}
                        onChange={(e) => handleUpdateModuleMeta('title', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={adminModule.category}
                        onChange={(e) => handleUpdateModuleMeta('category', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Estimated Time
                      </label>
                      <input
                        type="text"
                        value={adminModule.duration}
                        onChange={(e) => handleUpdateModuleMeta('duration', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Module Summary
                      </label>
                      <input
                        type="text"
                        value={adminModule.summary}
                        onChange={(e) => handleUpdateModuleMeta('summary', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Target Clinical Audience (ENT UK CPD Requirement)
                      </label>
                      <input
                        type="text"
                        value={adminModule.targetAudience || ''}
                        onChange={(e) =>
                          handleUpdateModuleMeta('targetAudience', e.target.value)
                        }
                        placeholder="e.g., ENT Trainees, Anaesthetists, Paediatricians & Paramedics"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Author / Faculty Name
                      </label>
                      <input
                        type="text"
                        value={adminModule.facultyName || ''}
                        onChange={(e) =>
                          handleUpdateModuleMeta('facultyName', e.target.value)
                        }
                        placeholder="e.g., Paediatric Airway Education Group"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Faculty Credentials / Role
                      </label>
                      <input
                        type="text"
                        value={adminModule.facultyCredentials || ''}
                        onChange={(e) =>
                          handleUpdateModuleMeta('facultyCredentials', e.target.value)
                        }
                        placeholder="e.g., Consultant ENT & Specialist Paramedic"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Conflict of Interest Disclosure
                      </label>
                      <input
                        type="text"
                        value={adminModule.coiDisclosure || ''}
                        onChange={(e) =>
                          handleUpdateModuleMeta('coiDisclosure', e.target.value)
                        }
                        placeholder="None declared"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Learning Objectives Manager */}
                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-2.5">
                    <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Module Learning Objectives ({(adminModule.learningObjectives || []).length} — Min. 2 required for ENT UK CPD)
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {(adminModule.learningObjectives || []).map((obj, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-emerald-200/70 text-xs"
                        >
                          <span className="text-slate-800">
                            {idx + 1}. {obj}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteModuleObjective(idx)}
                            className="text-slate-400 hover:text-rose-600 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newObjectiveDraft}
                        onChange={(e) => setNewObjectiveDraft(e.target.value)}
                        placeholder="Add measurable learning objective (e.g., Demonstrate safe stoma occlusion during oral BVM...)"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddModuleObjective}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0"
                      >
                        + Add Objective
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-4 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3 self-start">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-900">
                        Sections ({adminModule.sections.length})
                      </h3>
                      <button
                        onClick={resetSectionForm}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Section</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {adminModule.sections.map((sec, idx) => (
                        <div
                          key={sec.id || idx}
                          className={`p-3 rounded-xl border transition flex items-start justify-between gap-2 ${
                            editingSectionId === sec.id
                              ? 'bg-emerald-50/50 border-emerald-400'
                              : 'bg-slate-50/60 border-slate-200/80'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-400">
                              Section {idx + 1}
                            </div>
                            <div className="text-xs sm:text-sm font-semibold text-slate-900">
                              {sec.heading}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                              <span>{(sec.images || []).length} photos</span>
                              <span>•</span>
                              <span>{(sec.videos || []).length} videos</span>
                              {(sec.comparisonTable || []).length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>table</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveSection(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSection(idx, 1)}
                              disabled={idx === adminModule.sections.length - 1}
                              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => loadSectionIntoForm(sec)}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(sec.id)}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <form
                    onSubmit={handleSaveSection}
                    className="lg:col-span-8 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {editingSectionId
                          ? 'Edit Section Content & Media'
                          : 'Add a New Section to Module'}
                      </h3>

                      <button
                        type="button"
                        onClick={() => setPreviewSectionInEditor((p) => !p)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                          previewSectionInEditor
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{previewSectionInEditor ? 'Back to Editor' : 'Live Preview'}</span>
                      </button>
                    </div>

                    {previewSectionInEditor ? (
                      <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-4">
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                          Learner View Preview
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">
                          {sectionForm.heading || 'Untitled Section'}
                        </h2>
                        {renderFormattedSectionContent(sectionForm)}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-7">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Section Heading *
                            </label>
                            <input
                              type="text"
                              required
                              value={sectionForm.heading}
                              onChange={(e) =>
                                setSectionForm({ ...sectionForm, heading: e.target.value })
                              }
                              placeholder="e.g., Green Pathway: Tracheostomy Anatomy"
                              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900"
                            />
                          </div>

                          <div className="sm:col-span-5">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Text &amp; Media Flow Layout
                            </label>
                            <select
                              value={sectionForm.layout}
                              onChange={(e) =>
                                setSectionForm({ ...sectionForm, layout: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                            >
                              <option value="stacked">Stacked (Text Top, Media Below)</option>
                              <option value="media-right">Side-by-Side: Text Left / Media Right</option>
                              <option value="media-left">Side-by-Side: Media Left / Text Right</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <label className="block text-xs font-semibold text-slate-700">
                              Section Content (Supports Bullet Points, Numbered Lists &amp; Bold)
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => insertFormattingToken('bullet')}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1"
                              >
                                <List className="w-3 h-3" />
                                <span>Bullet</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => insertFormattingToken('numbered')}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1"
                              >
                                <ListOrdered className="w-3 h-3" />
                                <span>Numbered</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => insertFormattingToken('heading')}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1"
                              >
                                <Heading2 className="w-3 h-3" />
                                <span>Subheading</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => insertFormattingToken('bold')}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1"
                              >
                                <Bold className="w-3 h-3" />
                                <span>Bold</span>
                              </button>
                            </div>
                          </div>
                          <textarea
                            rows={6}
                            value={sectionForm.body}
                            onChange={(e) =>
                              setSectionForm({ ...sectionForm, body: e.target.value })
                            }
                            placeholder={`Write your teaching points here...\n- Use "- " at the start of a line for bullet points\n1. Use "1. " for numbered steps\n## Use "## " for subheadings\nWrap **key clinical terms** in double asterisks for bold.`}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 leading-relaxed"
                          />
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <Table className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              Quick-Reference Comparison Rows ({(sectionForm.comparisonTable || []).length})
                            </span>
                          </div>

                          {(sectionForm.comparisonTable || []).length > 0 && (
                            <div className="space-y-1.5">
                              {sectionForm.comparisonTable.map((row, rIdx) => (
                                <div
                                  key={rIdx}
                                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs"
                                >
                                  <div className="truncate">
                                    <strong className="text-slate-900">{row.label}:</strong>{' '}
                                    <span className="text-slate-600">{row.value}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSectionForm((prev) => ({
                                        ...prev,
                                        comparisonTable: prev.comparisonTable.filter(
                                          (_, idx) => idx !== rIdx
                                        )
                                      }))
                                    }
                                    className="text-slate-400 hover:text-rose-600 shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <input
                              type="text"
                              value={newTableRowDraft.label}
                              onChange={(e) =>
                                setNewTableRowDraft({
                                  ...newTableRowDraft,
                                  label: e.target.value
                                })
                              }
                              placeholder="Row Label (e.g., Cuff Type)"
                              className="sm:col-span-4 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                            />
                            <input
                              type="text"
                              value={newTableRowDraft.value}
                              onChange={(e) =>
                                setNewTableRowDraft({
                                  ...newTableRowDraft,
                                  value: e.target.value
                                })
                              }
                              placeholder="Details (e.g., Sterile water for Bivona TTS)"
                              className="sm:col-span-6 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                            />
                            <button
                              type="button"
                              onClick={handleAddTableRowToSection}
                              className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                            >
                              + Row
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-4">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Callout Banner Style
                            </label>
                            <select
                              value={sectionForm.calloutType}
                              onChange={(e) =>
                                setSectionForm({
                                  ...sectionForm,
                                  calloutType: e.target.value
                                })
                              }
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                            >
                              <option value="pearl">Green Clinical Takeaway</option>
                              <option value="warning">Amber Safety Caution</option>
                              <option value="info">Blue Reference Note</option>
                            </select>
                          </div>
                          <div className="sm:col-span-8">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Callout Box Text (Optional)
                            </label>
                            <input
                              type="text"
                              value={sectionForm.pearl}
                              onChange={(e) =>
                                setSectionForm({ ...sectionForm, pearl: e.target.value })
                              }
                              placeholder="e.g., Always check the NTSP Bedhead Sign on arrival."
                              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-200/80 space-y-2.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                            <RotateCw className="w-3.5 h-3.5 text-sky-600" />
                            <span>Active Recall Flip-Flashcard (Optional)</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={sectionForm.flashcardFront}
                              onChange={(e) =>
                                setSectionForm({
                                  ...sectionForm,
                                  flashcardFront: e.target.value
                                })
                              }
                              placeholder="Card Front (Question / Prompt)"
                              className="px-3 py-1.5 rounded-lg bg-white border border-sky-200 text-xs"
                            />
                            <input
                              type="text"
                              value={sectionForm.flashcardBack}
                              onChange={(e) =>
                                setSectionForm({
                                  ...sectionForm,
                                  flashcardBack: e.target.value
                                })
                              }
                              placeholder="Card Back (Clinical Answer)"
                              className="px-3 py-1.5 rounded-lg bg-white border border-sky-200 text-xs"
                            />
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/80 space-y-2.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                            <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Interactive Bedside Mini-Case Scenario (Optional)</span>
                          </div>
                          <textarea
                            rows={2}
                            value={sectionForm.miniCaseScenario}
                            onChange={(e) =>
                              setSectionForm({
                                ...sectionForm,
                                miniCaseScenario: e.target.value
                              })
                            }
                            placeholder="Describe a brief bedside scenario..."
                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={sectionForm.miniCaseOpt0}
                              onChange={(e) =>
                                setSectionForm({
                                  ...sectionForm,
                                  miniCaseOpt0: e.target.value
                                })
                              }
                              placeholder="Choice 1"
                              className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs"
                            />
                            <input
                              type="text"
                              value={sectionForm.miniCaseOpt1}
                              onChange={(e) =>
                                setSectionForm({
                                  ...sectionForm,
                                  miniCaseOpt1: e.target.value
                                })
                              }
                              placeholder="Choice 2"
                              className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs"
                            />
                            <input
                              type="text"
                              value={sectionForm.miniCaseOpt2}
                              onChange={(e) =>
                                setSectionForm({
                                  ...sectionForm,
                                  miniCaseOpt2: e.target.value
                                })
                              }
                              placeholder="Choice 3 (Optional)"
                              className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select
                              value={sectionForm.miniCaseCorrect}
                              onChange={(e) =>
                                setSectionForm({
                                  ...sectionForm,
                                  miniCaseCorrect: Number(e.target.value)
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-semibold"
                            >
                              <option value={0}>Correct: Choice 1</option>
                              <option value={1}>Correct: Choice 2</option>
                              <option value={2}>Correct: Choice 3</option>
                            </select>
                            <input
                              type="text"
                              value={sectionForm.miniCaseFeedback}
                              onChange={(e) =>
                                setSectionForm({
                                  ...sectionForm,
                                  miniCaseFeedback: e.target.value
                                })
                              }
                              placeholder="Clinical rationale shown after selection..."
                              className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs"
                            />
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Photos &amp; Diagrams ({sectionForm.images.length})</span>
                            </div>

                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer">
                              <Upload className="w-3 h-3" />
                              <span>
                                {uploadingMediaType === 'image'
                                  ? `Uploading ${uploadProgressPct}%...`
                                  : 'Upload Photo File'}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploadingMediaType !== null}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleUploadMediaFile(e.target.files[0], 'image');
                                    e.target.value = '';
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {sectionForm.images.length > 0 && (
                            <div className="space-y-1.5">
                              {sectionForm.images.map((img) => (
                                <div
                                  key={img.id}
                                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs"
                                >
                                  <span className="font-semibold text-slate-800 truncate">
                                    {img.title}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSectionForm((prev) => ({
                                        ...prev,
                                        images: prev.images.filter((i) => i.id !== img.id)
                                      }))
                                    }
                                    className="text-slate-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={newImageDraft.title}
                              onChange={(e) =>
                                setNewImageDraft({ ...newImageDraft, title: e.target.value })
                              }
                              placeholder="Photo title"
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                            />
                            <input
                              type="text"
                              value={newImageDraft.caption}
                              onChange={(e) =>
                                setNewImageDraft({ ...newImageDraft, caption: e.target.value })
                              }
                              placeholder="Caption"
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                            />
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={newImageDraft.url}
                                onChange={(e) =>
                                  setNewImageDraft({ ...newImageDraft, url: e.target.value })
                                }
                                placeholder="Or paste Image URL"
                                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                              />
                              <button
                                type="button"
                                onClick={handleAddImageToSectionForm}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold shrink-0"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Video className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Training Videos ({sectionForm.videos.length})</span>
                            </div>

                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer">
                              <Upload className="w-3 h-3" />
                              <span>
                                {uploadingMediaType === 'video'
                                  ? `Uploading ${uploadProgressPct}%...`
                                  : 'Upload Video (MP4/MOV)'}
                              </span>
                              <input
                                type="file"
                                accept="video/*"
                                disabled={uploadingMediaType !== null}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleUploadMediaFile(e.target.files[0], 'video');
                                    e.target.value = '';
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {sectionForm.videos.length > 0 && (
                            <div className="space-y-1.5">
                              {sectionForm.videos.map((vid) => (
                                <div
                                  key={vid.id}
                                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs"
                                >
                                  <span className="font-semibold text-slate-800 truncate">
                                    {vid.title} ({vid.duration})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSectionForm((prev) => ({
                                        ...prev,
                                        videos: prev.videos.filter((v) => v.id !== vid.id)
                                      }))
                                    }
                                    className="text-slate-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={newVideoDraft.title}
                              onChange={(e) =>
                                setNewVideoDraft({ ...newVideoDraft, title: e.target.value })
                              }
                              placeholder="Video title"
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                            />
                            <input
                              type="text"
                              value={newVideoDraft.duration}
                              onChange={(e) =>
                                setNewVideoDraft({ ...newVideoDraft, duration: e.target.value })
                              }
                              placeholder="Duration (e.g., 04:15)"
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                            />
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={newVideoDraft.url}
                                onChange={(e) =>
                                  setNewVideoDraft({ ...newVideoDraft, url: e.target.value })
                                }
                                placeholder="Or paste YouTube / Vimeo URL"
                                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                              />
                              <button
                                type="button"
                                onClick={handleAddVideoToSectionForm}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold shrink-0"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={newVideoDraft.transcript}
                            onChange={(e) =>
                              setNewVideoDraft({
                                ...newVideoDraft,
                                transcript: e.target.value
                              })
                            }
                            placeholder="Optional video chapters / transcript notes..."
                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      {editingSectionId && (
                        <button
                          type="button"
                          onClick={resetSectionForm}
                          className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm"
                      >
                        {editingSectionId ? 'Update Section & Sync' : 'Save Section & Sync'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Module Knowledge Check Quiz Editor */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        End-of-Module Knowledge Quiz ({adminModule.quiz.length} questions)
                      </h3>
                    </div>
                  </div>

                  {adminModule.quiz.length > 0 && (
                    <div className="space-y-2">
                      {adminModule.quiz.map((qItem, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="text-xs sm:text-sm font-semibold text-slate-900">
                              {idx + 1}. {qItem.q}
                            </div>
                            <div className="text-xs text-emerald-700 font-medium">
                              Correct answer: {qItem.options[qItem.correct]}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteQuizQuestion(idx)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={handleAddQuizQuestion}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3"
                  >
                    <div className="text-xs font-bold text-slate-800">
                      Add New Quiz Question
                    </div>
                    <input
                      type="text"
                      required
                      value={newQuizDraft.q}
                      onChange={(e) =>
                        setNewQuizDraft({ ...newQuizDraft, q: e.target.value })
                      }
                      placeholder="Question prompt..."
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        value={newQuizDraft.opt0}
                        onChange={(e) =>
                          setNewQuizDraft({ ...newQuizDraft, opt0: e.target.value })
                        }
                        placeholder="Option 1 *"
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                      />
                      <input
                        type="text"
                        required
                        value={newQuizDraft.opt1}
                        onChange={(e) =>
                          setNewQuizDraft({ ...newQuizDraft, opt1: e.target.value })
                        }
                        placeholder="Option 2 *"
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                      />
                      <input
                        type="text"
                        value={newQuizDraft.opt2}
                        onChange={(e) =>
                          setNewQuizDraft({ ...newQuizDraft, opt2: e.target.value })
                        }
                        placeholder="Option 3 (Optional)"
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={newQuizDraft.correct}
                        onChange={(e) =>
                          setNewQuizDraft({
                            ...newQuizDraft,
                            correct: Number(e.target.value)
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium"
                      >
                        <option value={0}>Correct: Option 1</option>
                        <option value={1}>Correct: Option 2</option>
                        <option value={2}>Correct: Option 3</option>
                      </select>
                      <input
                        type="text"
                        value={newQuizDraft.explanation}
                        onChange={(e) =>
                          setNewQuizDraft({
                            ...newQuizDraft,
                            explanation: e.target.value
                          })
                        }
                        placeholder="Clinical explanation shown after answering..."
                        className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        + Add Question &amp; Sync
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ==========================================
          MODAL: CREATE NEW CUSTOM DIAGRAM SIM
          ========================================== */}
      {showNewSimModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewSim}
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Create New Procedure Sim
              </h3>
              <button
                type="button"
                onClick={() => setShowNewSimModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Procedure Title *
              </label>
              <input
                type="text"
                required
                value={newSimForm.title}
                onChange={(e) =>
                  setNewSimForm({ ...newSimForm, title: e.target.value })
                }
                placeholder="e.g., Paediatric Bronchoscopy Foreign Body Retrieval"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Short Subtitle
              </label>
              <input
                type="text"
                value={newSimForm.subtitle}
                onChange={(e) =>
                  setNewSimForm({ ...newSimForm, subtitle: e.target.value })
                }
                placeholder="e.g., Step-by-step anatomical walkthrough"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Diagram Image URL (Optional — you can also upload after creating)
              </label>
              <input
                type="text"
                value={newSimForm.customDiagramUrl}
                onChange={(e) =>
                  setNewSimForm({ ...newSimForm, customDiagramUrl: e.target.value })
                }
                placeholder="https://..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewSimModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Create Procedure Sim
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==========================================
          MODAL: INSTANT GLOBAL CLINICAL SEARCH (CTRL/CMD + K)
          ========================================== */}
      {showGlobalSearch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center p-4 pt-16 sm:pt-24">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center gap-2.5">
              <Search className="w-4 h-4 text-emerald-600 shrink-0" />
              <input
                type="text"
                autoFocus
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder="Search pathways, steps, suction size, speaking valve, laryngectomy..."
                className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                onClick={() => setShowGlobalSearch(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-3.5 space-y-4">
              {!globalSearchQuery.trim() ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-xs text-slate-500">
                    Type any clinical term to jump straight to a pathway step or learning module.
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                    {['Rescue breaths', 'Cuff', 'Obturator', 'Red pathway', 'Suction depth'].map(
                      (tag) => (
                        <button
                          key={tag}
                          onClick={() => setGlobalSearchQuery(tag)}
                          className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-700"
                        >
                          {tag}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {globalSearchResults.pathways.length === 0 &&
                    globalSearchResults.steps.length === 0 &&
                    globalSearchResults.modules.length === 0 && (
                      <p className="text-center text-xs text-slate-400 py-6">
                        No matching pathways, steps, or modules found for &ldquo;{globalSearchQuery}&rdquo;.
                      </p>
                    )}

                  {globalSearchResults.pathways.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                        Pathways
                      </div>
                      {globalSearchResults.pathways.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setShowGlobalSearch(false);
                            handleOpenPathway(p.id);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 transition flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-slate-900">
                              {p.title}
                            </div>
                            <div className="text-xs text-slate-500">{p.subtitle}</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {globalSearchResults.steps.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                        Pathway Steps
                      </div>
                      {globalSearchResults.steps.map(({ pathway, node }) => (
                        <button
                          key={`${pathway.id}-${node.id}`}
                          onClick={() => {
                            setShowGlobalSearch(false);
                            handleOpenPathway(pathway.id, node.id);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 transition flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {cleanStepTitle(node.title)}
                            </div>
                            <div className="text-[11px] text-emerald-700 font-medium">
                              In {pathway.title}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {globalSearchResults.modules.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                        Learning Modules
                      </div>
                      {globalSearchResults.modules.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setShowGlobalSearch(false);
                            setAppMode('learning');
                            setLearningSectionTab('modules');
                            setActiveModuleId(m.id);
                            setActiveSectionIndex(0);
                            setMaxReachedSectionIndex(0);
                            setQuizUnlocked(false);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-sky-50/70 transition flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-slate-900">
                              {m.title}
                            </div>
                            <div className="text-xs text-slate-500">{m.summary}</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CPD CERTIFICATE GENERATOR
          ========================================== */}
      {showCpdModal && activeModule && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  PaedTraches.co.uk CPD Certificate
                </h3>
              </div>
              <button
                onClick={() => setShowCpdModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Your details stay strictly on your own device (zero PII stored in the cloud). Enter your name and optional appraisal reflection below, then download or save as PDF.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinician Name *
                </label>
                <input
                  type="text"
                  value={cpdClinicianName}
                  onChange={(e) => setCpdClinicianName(e.target.value)}
                  placeholder="e.g., Alex Morgan"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registration / Pin (Optional)
                </label>
                <input
                  type="text"
                  value={cpdRegNumber}
                  onChange={(e) => setCpdRegNumber(e.target.value)}
                  placeholder="e.g., PA12345 / GMC / NMC"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Points Learned (Optional)
                </label>
                <textarea
                  rows={2}
                  value={cpdKeyPointsLearned}
                  onChange={(e) => setCpdKeyPointsLearned(e.target.value)}
                  placeholder="e.g., NTSP Green vs Red oxygenation routes and removing speaking valves first..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  How Will This Change Practice? (Optional)
                </label>
                <textarea
                  rows={2}
                  value={cpdPracticeChange}
                  onChange={(e) => setCpdPracticeChange(e.target.value)}
                  placeholder="e.g., Check Bedhead Sign within 15s and size suction catheters using ID × 2..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl border-2 border-emerald-600/40 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-50/70 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-emerald-200/70 pb-3">
                <div className="flex items-center gap-2.5">
                  <PaedTrachesLogo className="w-9 h-9" />
                  <div>
                    <div className="font-extrabold text-sm text-slate-900 leading-none">
                      PaedTraches.co.uk
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                      Paediatric Tracheostomy Clinical Education
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 shrink-0">
                  CPD Certificate
                </span>
              </div>

              <div className="text-center space-y-1.5 py-1">
                <div className="text-[11px] font-medium text-slate-500">
                  This certifies that
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {cpdClinicianName.trim() || 'Registered Healthcare Clinician'}
                </div>
                {cpdRegNumber.trim() && (
                  <div className="text-xs font-semibold text-slate-500">
                    Registration / Pin: {cpdRegNumber.trim()}
                  </div>
                )}
                <div className="text-[11px] font-medium text-slate-500 pt-1">
                  has completed the clinical learning module &amp; 100% assessment
                </div>
                <div className="text-sm sm:text-base font-bold text-emerald-800">
                  &ldquo;{activeModule.title}&rdquo;
                </div>
                <div className="text-[11px] font-semibold text-slate-600">
                  on PaedTraches.co.uk •{' '}
                  {new Date().toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}{' '}
                  ({activeModule.duration})
                </div>
              </div>

              {(cpdKeyPointsLearned.trim() || cpdPracticeChange.trim()) && (
                <div className="p-3 rounded-xl bg-white/80 border border-emerald-200/70 text-xs text-slate-600 space-y-1">
                  <span className="font-bold text-emerald-800 block text-[10px] uppercase tracking-wider">
                    Reflective Practice Journal:
                  </span>
                  {cpdKeyPointsLearned.trim() && (
                    <p>
                      <strong>Key Points:</strong> {cpdKeyPointsLearned.trim()}
                    </p>
                  )}
                  {cpdPracticeChange.trim() && (
                    <p>
                      <strong>Practice Impact:</strong> {cpdPracticeChange.trim()}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCpdModal(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDownloadCertificateImage}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Certificate</span>
              </button>
              <button
                type="button"
                onClick={handlePrintCertificatePdf}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: STREAMLINED ENT UK COURSE FEEDBACK FORM
          ========================================== */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitCourseFeedback}
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Optional Course Evaluation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {feedbackSubmittedToast ? (
              <div className="p-6 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="text-sm font-bold text-slate-900">
                  Thank you for your feedback!
                </div>
                <p className="text-xs text-slate-500">
                  Your anonymous evaluation helps improve PaedTraches.co.uk clinical education.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  Anonymous quality feedback aligned with ENT UK CPD evaluation standards (zero personal details collected).
                </p>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Feedback For (Locked)
                    </span>
                    <span className="text-xs font-bold text-slate-900 block truncate mt-0.5">
                      {feedbackDraft.moduleTitle}
                    </span>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      1. Relevance to your clinical practice (1 = Poor, 5 = Excellent)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() =>
                            setFeedbackDraft({ ...feedbackDraft, relevanceRating: num })
                          }
                          className={`py-2 rounded-xl text-xs font-bold border transition ${
                            feedbackDraft.relevanceRating === num
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      2. Educational quality &amp; clarity of content (1 = Poor, 5 = Excellent)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() =>
                            setFeedbackDraft({ ...feedbackDraft, qualityRating: num })
                          }
                          className={`py-2 rounded-xl text-xs font-bold border transition ${
                            feedbackDraft.qualityRating === num
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      3. Effectiveness in meeting stated learning objectives (1–5)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() =>
                            setFeedbackDraft({ ...feedbackDraft, objectivesRating: num })
                          }
                          className={`py-2 rounded-xl text-xs font-bold border transition ${
                            feedbackDraft.objectivesRating === num
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      4. Overall satisfaction with this educational resource (1–5)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() =>
                            setFeedbackDraft({ ...feedbackDraft, overallRating: num })
                          }
                          className={`py-2 rounded-xl text-xs font-bold border transition ${
                            feedbackDraft.overallRating === num
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      5. Suggestions for improvement or further training needs (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={feedbackDraft.comments}
                      onChange={(e) =>
                        setFeedbackDraft({ ...feedbackDraft, comments: e.target.value })
                      }
                      placeholder="Any topics, videos, or improvements you would find helpful..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    Submit Feedback
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* ==========================================
          MODAL: CREATE NEW PATHWAY
          ========================================== */}
      {showNewPathwayModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewPathway}
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Create New Clinical Pathway
              </h3>
              <button
                type="button"
                onClick={() => setShowNewPathwayModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pathway Title *
              </label>
              <input
                type="text"
                required
                value={newPathwayForm.title}
                onChange={(e) =>
                  setNewPathwayForm({ ...newPathwayForm, title: e.target.value })
                }
                placeholder="e.g., Tracheostomy Bleeding / Haemorrhage"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Short Subtitle / Description
              </label>
              <input
                type="text"
                value={newPathwayForm.subtitle}
                onChange={(e) =>
                  setNewPathwayForm({ ...newPathwayForm, subtitle: e.target.value })
                }
                placeholder="e.g., Assessment and management of stomal or tracheal bleeding"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Placement Category
                </label>
                <select
                  value={newPathwayForm.category}
                  onChange={(e) =>
                    setNewPathwayForm({ ...newPathwayForm, category: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
                >
                  <option value="extra">Extra / Routine Pathway</option>
                  <option value="emergency">Core Emergency Pathway</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Colour Theme
                </label>
                <select
                  value={newPathwayForm.theme}
                  onChange={(e) =>
                    setNewPathwayForm({ ...newPathwayForm, theme: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
                >
                  <option value="amber">Amber (Routine / Caution)</option>
                  <option value="slate">Slate (Secondary Guide)</option>
                  <option value="green">NTSP Green</option>
                  <option value="red">NTSP Red</option>
                  <option value="blue">Resuscitation Blue</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Badge Label
              </label>
              <input
                type="text"
                value={newPathwayForm.badge}
                onChange={(e) =>
                  setNewPathwayForm({ ...newPathwayForm, badge: e.target.value })
                }
                placeholder="e.g., Routine & Secondary Care"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewPathwayModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Create Pathway
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==========================================
          MODAL: CREATE NEW LEARNING MODULE
          ========================================== */}
      {showNewModuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewModule}
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Create New Learning Module
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModuleModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Module Title *
              </label>
              <input
                type="text"
                required
                value={newModuleForm.title}
                onChange={(e) =>
                  setNewModuleForm({ ...newModuleForm, title: e.target.value })
                }
                placeholder="e.g., Humidification & Nebuliser Therapy"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={newModuleForm.category}
                  onChange={(e) =>
                    setNewModuleForm({ ...newModuleForm, category: e.target.value })
                  }
                  placeholder="Clinical Skills"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reading Time
                </label>
                <input
                  type="text"
                  value={newModuleForm.duration}
                  onChange={(e) =>
                    setNewModuleForm({ ...newModuleForm, duration: e.target.value })
                  }
                  placeholder="6 min read"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Brief Summary
              </label>
              <textarea
                rows={2}
                value={newModuleForm.summary}
                onChange={(e) =>
                  setNewModuleForm({ ...newModuleForm, summary: e.target.value })
                }
                placeholder="What will clinicians learn in this module?"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModuleModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Create Module
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==========================================
          CLINICAL GOVERNANCE, COPYRIGHT, FEEDBACK & PRIVACY FOOTER
          ========================================== */}
      <footer className="border-t border-slate-200/80 bg-white py-4 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span className="text-center md:text-left">
            © {new Date().getFullYear()} PaedTraches.co.uk ({INITIAL_GOVERNANCE_META.version}) — Original educational modules &amp; tools © PaedTraches; third-party clinical frameworks &amp; external links remain the property of their respective owners.
          </span>
          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <button
              onClick={() =>
                openLockedFeedbackModal(
                  appMode === 'learning' && learningSectionTab === 'modules' && activeModule
                    ? activeModule.title
                    : 'All Learning Modules (Overall Curriculum)'
                )
              }
              className="font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
            >
              Course Feedback
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setLegalModalTab('disclaimer');
                setShowGovernanceModal(true);
              }}
              className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2"
            >
              Governance
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setLegalModalTab('copyright');
                setShowGovernanceModal(true);
              }}
              className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2"
            >
              Copyright &amp; IP
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setLegalModalTab('terms');
                setShowGovernanceModal(true);
              }}
              className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2"
            >
              Terms &amp; Privacy
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setLegalModalTab('mhra');
                setShowGovernanceModal(true);
              }}
              className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2"
            >
              MHRA Notice
            </button>
          </div>
        </div>
      </footer>

      {/* ==========================================
          MODAL 1: ROADSIDE TOOLS (SIZER, HARDWARE ID, TROUBLESHOOT, GO-BAG & SBAR)
          ========================================== */}
      {activeToolModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                {activeToolModal === 'calculator' && (
                  <>
                    <Calculator className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Suction &amp; Tube Sizing Calculator
                    </h3>
                  </>
                )}
                {activeToolModal === 'hardware' && (
                  <>
                    <Package className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Paediatric Tube &amp; Hardware Identifier
                    </h3>
                  </>
                )}
                {activeToolModal === 'troubleshoot' && (
                  <>
                    <Wrench className="w-5 h-5 text-rose-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Airway Troubleshooting Matrix
                    </h3>
                  </>
                )}
                {activeToolModal === 'checklist' && (
                  <>
                    <ClipboardCheck className="w-5 h-5 text-sky-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Emergency Go-Bag Checklist
                    </h3>
                  </>
                )}
                {activeToolModal === 'handover' && (
                  <>
                    <Radio className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Paediatric A&amp;E / ENT Pre-Alert Builder
                    </h3>
                  </>
                )}
              </div>
              <button
                onClick={() => setActiveToolModal(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeToolModal === 'hardware' && (
              <div className="space-y-3.5">
                <p className="text-xs text-slate-500">
                  Rapid bedside identification of common paediatric tracheostomy tubes, sterile-water cuffs, and hub attachments.
                </p>
                <div className="space-y-3">
                  {tubeHardwareList.map((hw) => (
                    <div
                      key={hw.id}
                      className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900">{hw.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${hw.tagColor}`}
                        >
                          {hw.tag}
                        </span>
                      </div>
                      {hw.imageUrl ? (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                          <div className="sm:col-span-5 rounded-xl overflow-hidden border border-slate-200 bg-white">
                            <img
                              src={hw.imageUrl}
                              alt={hw.name}
                              className="w-full h-auto block"
                            />
                          </div>
                          <div className="sm:col-span-7 space-y-2">
                            <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 text-xs">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                Cuff / Valve Type
                              </span>
                              <span className="font-semibold text-slate-800">{hw.cuffType}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 text-xs">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                Inner Cannula
                              </span>
                              <span className="font-semibold text-slate-800">
                                {hw.innerCannula}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Cuff / Valve Type
                            </span>
                            <span className="font-semibold text-slate-800">{hw.cuffType}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Inner Cannula
                            </span>
                            <span className="font-semibold text-slate-800">
                              {hw.innerCannula}
                            </span>
                          </div>
                        </div>
                      )}
                      {hw.keyVisualCue && (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          <strong>Visual Cue:</strong> {hw.keyVisualCue}
                        </p>
                      )}
                      {hw.emergencyAction && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-950 font-medium">
                          <strong>Roadside Action:</strong> {hw.emergencyAction}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeToolModal === 'troubleshoot' && (() => {
              const activeIssue =
                TROUBLESHOOTING_MATRIX.find((t) => t.id === selectedTroubleshootId) ||
                TROUBLESHOOTING_MATRIX[0];

              return (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Select a presenting clinical sign or bedside problem for immediate causes and safe actions.
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {TROUBLESHOOTING_MATRIX.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedTroubleshootId(item.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition text-left ${
                          selectedTroubleshootId === item.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {item.symptom.split('/')[0].trim()}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        {activeIssue.symptom}
                      </h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${activeIssue.urgencyColor}`}
                      >
                        {activeIssue.urgency}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Likely Clinical Causes
                      </div>
                      <ul className="space-y-1 text-xs text-slate-700 list-disc pl-4">
                        {activeIssue.likelyCauses.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                        Immediate Safe Actions
                      </div>
                      <ol className="space-y-1.5 text-xs text-slate-800 font-medium list-decimal pl-4">
                        {activeIssue.immediateActions.map((act, idx) => (
                          <li key={idx}>{act}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              );
            })()}

            {activeToolModal === 'calculator' && (
              <div className="space-y-5">
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
                    <div className="text-[11px] font-semibold text-sky-800">
                      Typical Safe Depth
                    </div>
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
                    <div className="text-[11px] font-semibold text-slate-500">
                      Approx Age Guide
                    </div>
                    <div className="text-base font-bold text-slate-800 mt-1">
                      {currentSizingRow.ageGuide}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  Always defer to the child’s pre-measured suction depth documented on their NTSP Bedhead Sign or Caregiver Emergency Card.
                </p>
              </div>
            )}

            {activeToolModal === 'checklist' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Verify essential airway kit travels with the child in the ambulance.
                  </p>
                  <button
                    type="button"
                    onClick={() => setBagChecked({})}
                    className="text-xs font-semibold text-slate-500 hover:text-rose-600"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-2">
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
                        <span className={checked ? 'line-through' : 'font-medium'}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeToolModal === 'handover' && (() => {
              const formattedTube = formatWithUnit(handoverForm.tubeId, 'mm');
              const formattedDepth = formatWithUnit(handoverForm.suctionDepth, 'cm');
              const formattedSpo2 = formatWithUnit(handoverForm.obsSpo2, '%');
              const formattedO2 = formatWithUnit(handoverForm.obsO2, 'L/min');
              const formattedRr = formatWithUnit(handoverForm.obsRr, '/min');
              const formattedHr = formatWithUnit(handoverForm.obsHr, 'bpm');
              const formattedEtco2 = formatWithUnit(handoverForm.obsEtco2, 'kPa');
              const formattedCycles = formatWithUnit(handoverForm.cprCycles, 'cycles');

              const obsList = [
                formattedSpo2 && `SpO2 ${formattedSpo2}`,
                formattedO2 && `O2 ${formattedO2}`,
                formattedRr && `RR ${formattedRr}`,
                formattedHr && `HR ${formattedHr}`,
                formattedEtco2 && `EtCO2 ${formattedEtco2}`
              ].filter(Boolean);

              const interventionsList = [
                ...(handoverForm.selectedInterventions || []),
                ...(handoverForm.otherIntervention.trim()
                  ? [handoverForm.otherIntervention.trim()]
                  : [])
              ];

              const givenDrugsList = ALS_DRUG_OPTIONS.filter(
                (d) => handoverForm.alsDrugs?.[d.id]?.given
              ).map((d) => {
                const doseVal = (handoverForm.alsDrugs?.[d.id]?.doses || '').trim();
                const doseText = doseVal
                  ? `${doseVal} ${Number(doseVal) === 1 ? 'dose' : 'doses'}`
                  : '1 dose';
                return `${d.label} — ${doseText}`;
              });

              const travellingList = [
                ...(handoverForm.travellingWith || []),
                ...(handoverForm.travellingOther.trim()
                  ? [handoverForm.travellingOther.trim()]
                  : [])
              ];

              const isRedAirway = handoverForm.airwayType.startsWith('Red');

              const copyablePreAlertText = [
                'PAED TRACHEOSTOMY PRE-ALERT',
                `Airway: ${handoverForm.airwayType}`,
                handoverForm.childAge.trim() && `Age: ${handoverForm.childAge.trim()}`,
                (formattedTube || formattedDepth) &&
                  `Tube: ${formattedTube || 'Not stated'}${
                    formattedDepth ? ` (Depth ${formattedDepth})` : ''
                  }`,
                handoverForm.airwayEvent.trim() &&
                  `Airway Event: ${handoverForm.airwayEvent.trim()}`,
                interventionsList.length > 0 &&
                  `Interventions: ${interventionsList.join(', ')}`,
                obsList.length > 0 && `Obs: ${obsList.join(', ')}`,
                handoverForm.cprPerformed &&
                  `CPR: Performed${formattedCycles ? ` (${formattedCycles})` : ''}`,
                givenDrugsList.length > 0 &&
                  `ALS drugs given:\n${givenDrugsList.map((g) => `- ${g}`).join('\n')}`,
                travellingList.length > 0 &&
                  `Travelling with: ${travellingList.join(', ')}`
              ]
                .filter(Boolean)
                .join('\n');

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      Build a structured SBAR pre-alert (no patient identifiable details).
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setHandoverForm(createEmptyHandoverForm());
                        setShowHandoverCpr(false);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-rose-600 shrink-0"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        NTSP Airway Status
                      </label>
                      <select
                        value={handoverForm.airwayType}
                        onChange={(e) =>
                          setHandoverForm({ ...handoverForm, airwayType: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                      >
                        <option value="Green (Patent Upper Airway)">
                          Green (Patent Upper Airway)
                        </option>
                        <option value="Red (Laryngectomy / Neck-Only)">
                          Red (Laryngectomy / Neck-Only)
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Child Approx Age
                      </label>
                      <input
                        type="text"
                        value={handoverForm.childAge}
                        onChange={(e) =>
                          setHandoverForm({ ...handoverForm, childAge: e.target.value })
                        }
                        placeholder="e.g., 18 months"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tracheostomy Tube Size
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={handoverForm.tubeId}
                          onChange={(e) =>
                            setHandoverForm({ ...handoverForm, tubeId: e.target.value })
                          }
                          placeholder="e.g., 4.0"
                          className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">
                          mm
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Safe Suction Depth
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={handoverForm.suctionDepth}
                          onChange={(e) =>
                            setHandoverForm({ ...handoverForm, suctionDepth: e.target.value })
                          }
                          placeholder="e.g., 8.0"
                          className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">
                          cm
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Airway Event / Presentation
                    </label>
                    <input
                      type="text"
                      value={handoverForm.airwayEvent}
                      onChange={(e) =>
                        setHandoverForm({ ...handoverForm, airwayEvent: e.target.value })
                      }
                      placeholder="e.g., Suspected mucus plug with acute desaturation"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Interventions Performed (Tick all that apply)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {COMMON_INTERVENTIONS_OPTIONS.map((item) => {
                        const checked = (handoverForm.selectedInterventions || []).includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() =>
                              setHandoverForm((prev) => {
                                const list = prev.selectedInterventions || [];
                                return {
                                  ...prev,
                                  selectedInterventions: checked
                                    ? list.filter((x) => x !== item)
                                    : [...list, item]
                                };
                              })
                            }
                            className={`px-2.5 py-2 rounded-xl border text-left text-[11px] font-medium flex items-center gap-2 transition ${
                              checked
                                ? 'bg-sky-50 border-sky-300 text-sky-950 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                checked
                                  ? 'bg-sky-600 border-sky-600 text-white'
                                  : 'bg-white border-slate-300'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="leading-tight">{item}</span>
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={handoverForm.otherIntervention}
                      onChange={(e) =>
                        setHandoverForm({ ...handoverForm, otherIntervention: e.target.value })
                      }
                      placeholder="Other intervention (optional, e.g., Nebulised 0.9% NaCl)"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Current Observations
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          SpO2
                        </span>
                        <div className="relative">
                          <input
                            type="text"
                            value={handoverForm.obsSpo2}
                            onChange={(e) =>
                              setHandoverForm({ ...handoverForm, obsSpo2: e.target.value })
                            }
                            placeholder="97"
                            className="w-full pl-2.5 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 pointer-events-none">
                            %
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          O2 Delivery
                        </span>
                        <div className="relative">
                          <input
                            type="text"
                            value={handoverForm.obsO2}
                            onChange={(e) =>
                              setHandoverForm({ ...handoverForm, obsO2: e.target.value })
                            }
                            placeholder="10"
                            className="w-full pl-2.5 pr-11 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 pointer-events-none">
                            L/min
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Resp Rate
                        </span>
                        <div className="relative">
                          <input
                            type="text"
                            value={handoverForm.obsRr}
                            onChange={(e) =>
                              setHandoverForm({ ...handoverForm, obsRr: e.target.value })
                            }
                            placeholder="28"
                            className="w-full pl-2.5 pr-10 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 pointer-events-none">
                            /min
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Heart Rate
                        </span>
                        <div className="relative">
                          <input
                            type="text"
                            value={handoverForm.obsHr}
                            onChange={(e) =>
                              setHandoverForm({ ...handoverForm, obsHr: e.target.value })
                            }
                            placeholder="132"
                            className="w-full pl-2.5 pr-10 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 pointer-events-none">
                            bpm
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          EtCO2
                        </span>
                        <div className="relative">
                          <input
                            type="text"
                            value={handoverForm.obsEtco2}
                            onChange={(e) =>
                              setHandoverForm({ ...handoverForm, obsEtco2: e.target.value })
                            }
                            placeholder="4.8"
                            className="w-full pl-2.5 pr-9 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 pointer-events-none">
                            kPa
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Travelling With &amp; Equipment On Board
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {TRAVELLING_WITH_OPTIONS.map((item) => {
                        const checked = (handoverForm.travellingWith || []).includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() =>
                              setHandoverForm((prev) => {
                                const list = prev.travellingWith || [];
                                return {
                                  ...prev,
                                  travellingWith: checked
                                    ? list.filter((x) => x !== item)
                                    : [...list, item]
                                };
                              })
                            }
                            className={`px-3 py-2 rounded-xl border text-left text-xs font-medium flex items-center gap-2 transition ${
                              checked
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                checked
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'bg-white border-slate-300'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="leading-tight">{item}</span>
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={handoverForm.travellingOther}
                      onChange={(e) =>
                        setHandoverForm({ ...handoverForm, travellingOther: e.target.value })
                      }
                      placeholder="Other / notes (optional)"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/70">
                    <button
                      type="button"
                      onClick={() => setShowHandoverCpr((prev) => !prev)}
                      className="w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 hover:bg-slate-100/70 transition"
                    >
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                        <span>CPR / Resuscitation &amp; ALS Drugs (Optional)</span>
                        {(handoverForm.cprPerformed || givenDrugsList.length > 0) && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            Active
                          </span>
                        )}
                      </span>
                      {showHandoverCpr ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {showHandoverCpr && (
                      <div className="p-3.5 pt-2.5 border-t border-slate-200/80 space-y-3 bg-white">
                        <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setHandoverForm((prev) => ({
                                ...prev,
                                cprPerformed: !prev.cprPerformed
                              }))
                            }
                            className="inline-flex items-center gap-2.5 text-xs font-bold text-rose-950"
                          >
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                                handoverForm.cprPerformed
                                  ? 'bg-rose-600 border-rose-600 text-white'
                                  : 'bg-white border-rose-300'
                              }`}
                            >
                              {handoverForm.cprPerformed && (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                            </div>
                            <span>CPR / Chest Compressions Given</span>
                          </button>

                          {handoverForm.cprPerformed && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-rose-900">
                                Cycles:
                              </span>
                              <div className="relative w-28">
                                <input
                                  type="text"
                                  value={handoverForm.cprCycles}
                                  onChange={(e) =>
                                    setHandoverForm({
                                      ...handoverForm,
                                      cprCycles: e.target.value
                                    })
                                  }
                                  placeholder="e.g., 3"
                                  className="w-full pl-2.5 pr-12 py-1.5 rounded-xl bg-white border border-rose-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 pointer-events-none">
                                  cycles
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-slate-100">
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Paediatric ALS Drugs Given (Tick &amp; enter doses)
                          </span>
                          <div className="space-y-1.5">
                            {ALS_DRUG_OPTIONS.map((drug) => {
                              const entry = handoverForm.alsDrugs?.[drug.id] || {
                                given: false,
                                doses: '1'
                              };
                              return (
                                <div
                                  key={drug.id}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                                    entry.given
                                      ? 'bg-rose-50/60 border-rose-200'
                                      : 'bg-slate-50/70 border-slate-200/80'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setHandoverForm((prev) => ({
                                        ...prev,
                                        alsDrugs: {
                                          ...(prev.alsDrugs || {}),
                                          [drug.id]: {
                                            given: !entry.given,
                                            doses: entry.doses || '1'
                                          }
                                        }
                                      }))
                                    }
                                    className="flex items-center gap-2 text-left text-xs font-medium text-slate-800 flex-1"
                                  >
                                    <div
                                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                        entry.given
                                          ? 'bg-rose-600 border-rose-600 text-white'
                                          : 'bg-white border-slate-300'
                                      }`}
                                    >
                                      {entry.given && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <span className={entry.given ? 'font-semibold text-slate-900' : ''}>
                                      {drug.label}
                                    </span>
                                  </button>

                                  {entry.given && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-[10px] font-semibold text-slate-500">
                                        Doses:
                                      </span>
                                      <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={entry.doses}
                                        onChange={(e) =>
                                          setHandoverForm((prev) => ({
                                            ...prev,
                                            alsDrugs: {
                                              ...(prev.alsDrugs || {}),
                                              [drug.id]: {
                                                given: true,
                                                doses: e.target.value
                                              }
                                            }
                                          }))
                                        }
                                        className="w-14 px-2 py-1 rounded-lg bg-white border border-rose-200 text-xs font-bold text-center text-slate-900"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 overflow-hidden shadow-2xs">
                    <div
                      className={`px-4 py-2.5 flex items-center justify-between border-b ${
                        isRedAirway
                          ? 'bg-rose-50 border-rose-200/80 text-rose-900'
                          : 'bg-emerald-50 border-emerald-200/80 text-emerald-900'
                      }`}
                    >
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">
                        Pre-Alert Handover Summary
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isRedAirway
                            ? 'bg-rose-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {handoverForm.airwayType}
                      </span>
                    </div>

                    <div className="p-4 space-y-3 text-xs">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                          <div className="text-[10px] font-semibold uppercase text-slate-400">
                            Approx Age
                          </div>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {handoverForm.childAge.trim() || '—'}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                          <div className="text-[10px] font-semibold uppercase text-slate-400">
                            Tube Size
                          </div>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {formattedTube || '—'}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                          <div className="text-[10px] font-semibold uppercase text-slate-400">
                            Suction Depth
                          </div>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {formattedDepth || '—'}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-2">
                        <div>
                          <div className="text-[10px] font-semibold uppercase text-slate-400">
                            Airway Event
                          </div>
                          <div className="text-slate-800 font-medium mt-0.5">
                            {handoverForm.airwayEvent.trim() || 'No event entered yet'}
                          </div>
                        </div>

                        {interventionsList.length > 0 && (
                          <div className="pt-2 border-t border-slate-100">
                            <div className="text-[10px] font-semibold uppercase text-slate-400 mb-1">
                              Interventions Performed
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {interventionsList.map((inv) => (
                                <span
                                  key={inv}
                                  className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200/70 font-semibold text-[11px]"
                                >
                                  {inv}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {obsList.length > 0 && (
                        <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                          <div className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5">
                            Current Observations
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {obsList.map((ob) => (
                              <span
                                key={ob}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold text-[11px]"
                              >
                                {ob}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(handoverForm.cprPerformed || givenDrugsList.length > 0) && (
                        <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-950 space-y-1.5">
                          {handoverForm.cprPerformed && (
                            <div className="font-bold">
                              CPR Performed
                              {formattedCycles ? ` (${formattedCycles})` : ''}
                            </div>
                          )}
                          {givenDrugsList.length > 0 && (
                            <div className="space-y-0.5">
                              <div className="font-bold text-rose-900">ALS drugs given:</div>
                              <div className="space-y-0.5 pl-1">
                                {givenDrugsList.map((drugLine, idx) => (
                                  <div key={idx} className="text-rose-900">
                                    - {drugLine}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {travellingList.length > 0 && (
                        <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                          <div className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5">
                            Travelling With &amp; Equipment
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {travellingList.map((item) => (
                              <span
                                key={item}
                                className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold text-[11px]"
                              >
                                ✓ {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const ta = document.createElement('textarea');
                      ta.value = copyablePreAlertText;
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand('copy');
                      document.body.removeChild(ta);
                      setHandoverCopied(true);
                      setTimeout(() => setHandoverCopied(false), 3000);
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>
                      {handoverCopied
                        ? '✓ Copied Pre-Alert to Clipboard!'
                        : 'Copy Pre-Alert Text for CAD / MDT'}
                    </span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: FLOWCHART STEP INSPECTOR
          ========================================== */}
      {flowchartInspectNode && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {cleanStepTitle(flowchartInspectNode.title)}
                </h3>
                {flowchartInspectNode.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {flowchartInspectNode.subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={() => setFlowchartInspectNode(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {flowchartInspectNode.criticalNote && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
                {flowchartInspectNode.criticalNote}
              </div>
            )}

            {flowchartInspectNode.checklist && flowchartInspectNode.checklist.length > 0 && (
              <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5">
                {flowchartInspectNode.checklist.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setFlowchartInspectNode(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setCurrentNodeId(flowchartInspectNode.id);
                  setNodeHistory((prev) => [...prev, flowchartInspectNode.id]);
                  setFlowchartInspectNode(null);
                  setPathwayViewMode('interactive');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Open in Interactive Step-by-Step
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: SAVE TO HOME SCREEN & OFFLINE SHIFT PACK (PWA)
          ========================================== */}
      {showPwaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Save App &amp; Offline Shift Pack
                </h3>
              </div>
              <button
                onClick={() => setShowPwaModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <HardDriveDownload className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Offline Dead-Zone Shift Cache</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200">
                  {pathways.length} Pathways • {learningModules.length} Modules
                </span>
              </div>
              <p className="text-xs text-emerald-900/80 leading-relaxed">
                {offlinePackSyncedAt
                  ? `✓ All pathways, sizing tables, hardware guides, and modules are cached on this device (Last synced: ${offlinePackSyncedAt}).`
                  : 'Cache all pathways and reference tables onto your device before starting a shift in low-signal areas.'}
              </p>
              <button
                type="button"
                onClick={() => syncOfflineShiftPack(pathways, learningModules, tubeHardwareList, true)}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <HardDriveDownload className="w-3.5 h-3.5" />
                <span>
                  {offlineSyncToast
                    ? '✓ Offline Shift Pack Updated!'
                    : 'Sync Latest Offline Shift Pack Now'}
                </span>
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Add <strong>PaedTraches</strong> to your phone’s home screen for one-tap roadside access with the custom green tracheostomy app icon:
              </p>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-900">iOS (Safari):</div>
                <p className="text-xs text-slate-500">
                  Tap <strong>Share</strong> at the bottom of the screen, then select <strong>Add to Home Screen</strong>.
                </p>
                <div className="font-semibold text-slate-900 pt-1">Android (Chrome):</div>
                <p className="text-xs text-slate-500">
                  Tap the <strong>menu (⋮)</strong> in the top right and select <strong>Add to Home screen</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowPwaModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs sm:text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 4: UK CLINICAL GOVERNANCE, COPYRIGHT, TERMS & PRIVACY HUB
          ========================================== */}
      {showGovernanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 border border-slate-200 shadow-xl space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Legal, Copyright, Clinical Governance &amp; UK Compliance
                </h3>
              </div>
              <button
                onClick={() => setShowGovernanceModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setLegalModalTab('disclaimer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  legalModalTab === 'disclaimer'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Clinical Disclaimer
              </button>
              <button
                onClick={() => setLegalModalTab('copyright')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  legalModalTab === 'copyright'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Copyright &amp; IP
              </button>
              <button
                onClick={() => setLegalModalTab('mhra')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  legalModalTab === 'mhra'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                UK MHRA / SaMD Status
              </button>
              <button
                onClick={() => setLegalModalTab('terms')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  legalModalTab === 'terms'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Terms &amp; UK GDPR
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed pr-1 flex-1">
              {legalModalTab === 'disclaimer' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">Document Version:</span>
                      <strong className="text-slate-800">{INITIAL_GOVERNANCE_META.version}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Review Cycle:</span>
                      <strong className="text-slate-800">
                        Reviewed {INITIAL_GOVERNANCE_META.lastReviewed} (Due {INITIAL_GOVERNANCE_META.nextReviewDue})
                      </strong>
                    </div>
                  </div>
                  <p>
                    <strong>1. Scope &amp; Intended Audience:</strong> PaedTraches.co.uk is an open-access educational and rapid visual reference tool designed for UK registered paramedics (HCPC), ENT trainees, anaesthetists, paediatricians, emergency department clinicians, and pre-hospital responders.
                  </p>
                  <p>
                    <strong>2. Primacy of Local Trust &amp; JRCALC Guidelines:</strong> This platform reproduces established national principles from the National Tracheostomy Safety Project (NTSP) and Resuscitation Council UK. It does <strong>not</strong> replace clinical judgement, individualised patient Bedhead Signs, or your employing NHS Trust and JRCALC Clinical Practice Guidelines.
                  </p>
                  <p>
                    <strong>3. Medication &amp; Equipment Verification:</strong> It is the sole responsibility of the attending clinician to verify equipment sizing, suction pressures, and drug dosages prior to administration.
                  </p>
                </div>
              )}

              {legalModalTab === 'copyright' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-medium">
                    <strong>Copyright &amp; Intellectual Property Notice — PaedTraches.co.uk:</strong>
                  </div>
                  <p>
                    <strong>1. Original Content Owned by PaedTraches:</strong> The majority of content on this website—including the custom interactive step-by-step decision engine, original educational module prose, learning objectives, assessment questions, Pre-Alert handover builder, software interface, and PaedTraches branding—is the original copyright of <strong>PaedTraches.co.uk</strong>. Individual healthcare professionals may use and print materials (including CPD certificates) for personal study and non-commercial clinical education.
                  </p>
                  <p>
                    <strong>2. Third-Party Clinical Frameworks &amp; External Materials (Caveat):</strong> Not all referenced frameworks, external media, or linked resources are owned by PaedTraches. Algorithm colour-coding (Green / Red pathways) and foundational airway emergency sequences are adapted from open-access national guidance published by the <strong>National Tracheostomy Safety Project (NTSP)</strong> and <strong>Resuscitation Council UK</strong>.
                  </p>
                  <p>
                    <strong>3. External Links &amp; Illustrative Media:</strong> Linked clinical guidelines (such as NICE, GOSH, and DAS) and third-party photographs or embedded educational videos remain the copyright and intellectual property of their respective authors, NHS Trusts, and publishers.
                  </p>
                </div>
              )}

              {legalModalTab === 'mhra' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-medium">
                    <strong>UK Medical Devices Regulations 2002 (as amended) &amp; MHRA Guidance Notice:</strong>
                  </div>
                  <p>
                    In accordance with UK Medicines and Healthcare products Regulatory Agency (MHRA) guidance on <em>Software and AI as a Medical Device (SaMD)</em>:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                      <strong>Electronic Reference &amp; Flowchart Visualisation:</strong> Digital flowcharts that digitise published clinical pathways (such as NTSP Green/Red algorithms) where the healthcare professional retains full visibility of every step are classified as clinical reference material rather than a medical device.
                    </li>
                    <li>
                      <strong>Transparent Lookup Table (Suction Sizer):</strong> The Suction &amp; Tube Sizer displays a transparent, standard lookup table (`Catheter Fr = Tube ID mm × 2`) and always instructs clinicians to defer to the patient’s pre-measured Bedhead Sign depth.
                    </li>
                    <li>
                      <strong>DCB0129 / DCB0160 Clinical Risk Management:</strong> Any NHS Trust or organisation embedding this tool into formal operational workflows should log it within their local Clinical Safety Case Report under DCB0160.
                    </li>
                  </ul>
                </div>
              )}

              {legalModalTab === 'terms' && (
                <div className="space-y-3">
                  <p>
                    <strong>1. Acceptance of Terms:</strong> By accessing or saving PaedTraches.co.uk, you acknowledge that the platform is provided free of charge on an &ldquo;as-is&rdquo; educational basis. To the fullest extent permitted by UK law, the authors and clinical editors accept no liability for clinical outcomes arising from reliance on this educational reference.
                  </p>
                  <p>
                    <strong>2. Zero Patient Identifiable Data (Caldicott &amp; UK GDPR Compliant):</strong> This application never requests, processes, or stores any patient identifiable information (PII) or clinical incident records.
                  </p>
                  <p>
                    <strong>3. Clinician Privacy &amp; Functional Storage:</strong> Clinicians do not need to create an account or submit personal data to use the pathways, learning modules, or CPD certificate generator (names typed onto certificates remain strictly in your local browser memory). In accordance with UK PECR, strictly necessary local storage is used only to cache emergency pathways for offline use and remember anonymous module completion status.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setShowGovernanceModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs sm:text-sm"
              >
                Acknowledge &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}