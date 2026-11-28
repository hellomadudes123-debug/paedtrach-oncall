import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  initializeFirestore,
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
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Award,
  Bold,
  BookMarked,
  BookOpen,
  Bug,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Cloud,
  Compass,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileDown,
  FileText,
  FolderPlus,
  Globe,
  Heading2,
  HeartPulse,
  HelpCircle,
  History,
  Image as ImageIcon,
  Info,
  KeyRound,
  Layers,
  List,
  ListOrdered,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MessageSquarePlus,
  Moon,
  Package,
  Pause,
  Play,
  Plus,
  Printer,
  Radio,
  RotateCcw,
  RotateCw,
  Scale,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  Table,
  Target,
  Timer,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  Video,
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
let storage = null;
let secondaryApp = null;
let secondaryAuth = null;

try {
  if (PASTE_YOUR_FIREBASE_CONFIG_HERE && PASTE_YOUR_FIREBASE_CONFIG_HERE.apiKey) {
    firebaseApp = initializeApp(PASTE_YOUR_FIREBASE_CONFIG_HERE);
    auth = getAuth(firebaseApp);
    try {
      db = initializeFirestore(firebaseApp, {
        experimentalAutoDetectLongPolling: true
      });
    } catch {
      db = getFirestore(firebaseApp);
    }
    storage = getStorage(firebaseApp);
    try {
      secondaryApp = initializeApp(
        PASTE_YOUR_FIREBASE_CONFIG_HERE,
        'PaedTrachesAdminProvisioner'
      );
      secondaryAuth = getAuth(secondaryApp);
    } catch {
      // Secondary app already initialized during HMR
    }
  }
} catch (err) {
  console.warn('Firebase running in offline localStorage mode:', err);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'paedtrach-oncall-pwa';

// ==========================================
// EMBED VIDEO & RICH TEXT FORMATTER FOR LEARNING MODULES
// ==========================================
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
    url.includes('firebasestorage.googleapis.com') ||
    url.startsWith('blob:') ||
    url.startsWith('data:video/')
  ) {
    return { type: 'video', src: url };
  }
  return { type: 'link', src: url };
};

const renderInlineBold = (text = '') => {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
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

const normalizeRichLearningModule = (mod) => ({
  ...mod,
  category: mod.category || mod.badge || 'Clinical Skills',
  settingTags:
    Array.isArray(mod.settingTags) && mod.settingTags.length > 0
      ? mod.settingTags
      : ['pre-hospital', 'in-patient', 'community'],
  learningObjectives: Array.isArray(mod.learningObjectives) ? mod.learningObjectives : [],
  references: Array.isArray(mod.references) ? mod.references : [],
  sections: (Array.isArray(mod.sections) ? mod.sections : []).map((sec, idx) => ({
    ...sec,
    id: sec.id || `sec-${mod.id || 'mod'}-${idx}`,
    layout: sec.layout || 'stacked',
    calloutType: sec.calloutType || 'pearl',
    comparisonTable: Array.isArray(sec.comparisonTable) ? sec.comparisonTable : [],
    images: Array.isArray(sec.images) ? sec.images : [],
    videos: Array.isArray(sec.videos) ? sec.videos : []
  })),
  quiz: (Array.isArray(mod.quiz) ? mod.quiz : []).map((qItem) => ({
    q: qItem.q || qItem.question || '',
    options: Array.isArray(qItem.options) ? qItem.options : [],
    correct:
      typeof qItem.correct === 'number'
        ? qItem.correct
        : typeof qItem.correctIndex === 'number'
        ? qItem.correctIndex
        : 0,
    explanation: qItem.explanation || ''
  }))
});

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
// CLINICAL GOVERNANCE, FOOTER NOTICES & ADMIN TEAM DEFAULTS
// ==========================================
const INITIAL_GOVERNANCE_META = {
  version: 'v3.3 (2026/27 Edition)',
  clinicalLead: 'Paediatric Airway & Pre-Hospital Education Group',
  lastReviewed: '2026-02-18',
  nextReviewDue: '2027-02-18',
  mhraNotice:
    'Classified as an open-access clinical reference & educational pathway visualiser (not a bespoke diagnostic calculator or Class I Medical Device under UK MDR 2002 / MHRA guidance). Clinicians must apply independent professional judgement and verify against current JRCALC / local NHS Ambulance Trust guidelines.'
};

const INITIAL_SITE_NOTICES = {
  version: INITIAL_GOVERNANCE_META.version,
  clinicalLead: INITIAL_GOVERNANCE_META.clinicalLead,
  lastReviewed: INITIAL_GOVERNANCE_META.lastReviewed,
  nextReviewDue: INITIAL_GOVERNANCE_META.nextReviewDue,
  footerNotice:
    'Original educational modules & tools © PaedTraches; third-party clinical frameworks & external links remain the property of their respective owners.',
  disclaimerText: `**1. Scope & Intended Audience:** PaedTraches.co.uk is an open-access educational and rapid visual reference tool designed for UK registered paramedics (HCPC), ENT trainees, anaesthetists, paediatricians, emergency department clinicians, and pre-hospital responders.

**2. Primacy of Local Trust & JRCALC Guidelines:** This platform reproduces established national principles from the National Tracheostomy Safety Project (NTSP) and Resuscitation Council UK. It does **not** replace clinical judgement, individualised patient Bedhead Signs, or your employing NHS Trust and JRCALC Clinical Practice Guidelines.

**3. Medication & Equipment Verification:** It is the sole responsibility of the attending clinician to verify equipment sizing, suction pressures, and drug dosages prior to administration.`,
  copyrightBanner: 'Copyright & Intellectual Property Notice — PaedTraches.co.uk:',
  copyrightText: `**1. Original Content Owned by PaedTraches:** The majority of content on this website—including the custom interactive step-by-step decision engine, original educational module prose, learning objectives, assessment questions, Pre-Alert handover builder, software interface, and PaedTraches branding—is the original copyright of **PaedTraches.co.uk**. Individual healthcare professionals may use and print materials (including CPD certificates) for personal study and non-commercial clinical education.

**2. Third-Party Clinical Frameworks & External Materials (Caveat):** Not all referenced frameworks, external media, or linked resources are owned by PaedTraches. Algorithm colour-coding (Green / Red pathways) and foundational airway emergency sequences are adapted from open-access national guidance published by the **National Tracheostomy Safety Project (NTSP)** and **Resuscitation Council UK**.

**3. External Links & Illustrative Media:** Linked clinical guidelines (such as NICE, GOSH, and DAS) and third-party photographs or embedded educational videos remain the copyright and intellectual property of their respective authors, NHS Trusts, and publishers.`,
  mhraBanner: 'UK Medical Devices Regulations 2002 (as amended) & MHRA Guidance Notice:',
  mhraText: `In accordance with UK Medicines and Healthcare products Regulatory Agency (MHRA) guidance on Software and AI as a Medical Device (SaMD):

- **Electronic Reference & Flowchart Visualisation:** Digital flowcharts that digitise published clinical pathways (such as NTSP Green/Red algorithms) where the healthcare professional retains full visibility of every step are classified as clinical reference material rather than a medical device.
- **Transparent Lookup Table (Suction Sizer):** The Suction & Tube Sizer displays a transparent, standard lookup table (Catheter Fr = Tube ID mm × 2) and always instructs clinicians to defer to the patient’s pre-measured Bedhead Sign depth.
- **DCB0129 / DCB0160 Clinical Risk Management:** Any NHS Trust or organisation embedding this tool into formal operational workflows should log it within their local Clinical Safety Case Report under DCB0160.`,
  termsText: `**1. Acceptance of Terms:** By accessing or saving PaedTraches.co.uk, you acknowledge that the platform is provided free of charge on an "as-is" educational basis. To the fullest extent permitted by UK law, the authors and clinical editors accept no liability for clinical outcomes arising from reliance on this educational reference.

**2. Zero Patient Identifiable Data (Caldicott & UK GDPR Compliant):** This application never requests, processes, or stores any patient identifiable information (PII) or clinical incident records.

**3. Clinician Privacy & Functional Storage:** Clinicians do not need to create an account or submit personal data to use the pathways, learning modules, or feedback forms. Anonymous feedback entries are automatically purged after 6 months. Strictly necessary local storage is used only to cache emergency pathways and offline Tube ID photos for low-signal shift use.`
};

const INITIAL_ADMIN_USERS = [
  {
    id: 'adm-lead-1',
    name: 'Clinical Airway Lead',
    email: 'ent.lead@nhs.net',
    role: 'Clinical Lead (Super Admin)',
    addedAt: '2026-01-15'
  }
];

const INITIAL_AUDIT_LOGS = [
  {
    id: 'aud-1',
    actor: 'Clinical Airway Lead',
    action: 'Initialised PaedTraches clinical pathways, learning modules & governance notices',
    timestamp: '2026-02-18'
  }
];

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
        criticalNote:
          'Verify the patient’s Bedhead Sign or Caregiver Emergency Card for tube size, suction depth, and upper airway status.',
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
        criticalNote:
          'Avoid hyperextending a child’s neck as the paediatric trachea is soft and easily compressed.',
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
        criticalNote:
          'Attach paediatric BVM to the 15mm tracheostomy connector. If chest does not rise, assess tube patency immediately.',
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
        criticalNote:
          'Never use a rigid Yankauer sucker inside a tracheostomy tube. Use a flexible catheter sized at double the tube ID.',
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
        criticalNote:
          'Apply suction only while withdrawing the catheter for no more than 5 to 10 seconds.',
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
        criticalNote:
          'Most paediatric tubes are uncuffed, or use sterile water or air cuffs. Check the pilot balloon.',
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
        criticalNote:
          'Release Velcro ties or cut cotton tapes with blunt-ended scissors and withdraw the tube in a smooth downward curve.',
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
        criticalNote:
          'Never force a tube into the stoma. Remove the solid obturator immediately after the tube enters the stoma.',
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
        criticalNote:
          'When ventilating via the mouth/nose, occlude the neck stoma with gauze so air does not escape out of the neck.',
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
        criticalNote:
          'Use the 2-Minute CPR Timer at the top of the pathway to track cycles.',
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
        criticalNote:
          'Always bring the child’s Emergency Tracheostomy Go-Bag and caregiver in the ambulance.',
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
        criticalNote:
          'Do NOT attempt oral oxygenation or oral intubation unless the patient’s care plan explicitly states otherwise.',
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
        criticalNote:
          'All assessment, oxygenation, and ventilation must take place directly at the neck stoma.',
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
        criticalNote:
          'Attach paediatric BVM with 15mm connector directly to the tracheostomy hub if ventilation is needed.',
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
        criticalNote:
          'NEVER occlude the stoma in a Red Pathway patient — it is their only airway.',
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
        criticalNote:
          'Maintain neutral head position so neck skin folds do not cover the open stoma.',
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
        criticalNote:
          'Follow local Ambulance Trust / JRCALC guidelines. Clearing a blocked tracheostomy is the highest priority.',
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
        criticalNote:
          'If the chest fails to rise on the first 2 breaths via the tube, assume the tube is blocked or displaced.',
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
        criticalNote:
          'Check the neck for surgical emphysema if forceful ventilation was attempted through a displaced tube.',
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
        criticalNote:
          'Follow local Ambulance Trust guidelines and utilize trained parent/caregiver expertise whenever available.',
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
        criticalNote:
          'Never advance the catheter beyond the pre-measured depth to avoid carinal trauma and vagal bradycardia.',
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
        criticalNote:
          'Do not flush large volumes of saline down a tracheostomy tube. If catheter cannot pass, switch to the Emergency Pathway.',
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
        criticalNote:
          'Inspect HME filters frequently during ambulance transfer—if wet or clogged with sputum, replace immediately.',
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
        criticalNote:
          'If the child shows severe stridor, cyanosis, or apnoea, switch immediately to the NTSP Emergency Pathway.',
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
        criticalNote:
          'If replacing the tube, try the same size first, then the 0.5 mm smaller downsize tube with water-soluble lubricant.',
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
        criticalNote:
          'Instruct the child or caregiver to gently press a sterile dressing over the stoma when coughing or speaking.',
        checklist: [
          'Wipe secretions from around the neck stoma with sterile gauze',
          'Monitor continuous SpO2, respiratory rate, work of breathing, and heart rate',
          'Convey to a hospital with Paediatric ENT capability and bring all home tracheostomy equipment'
        ]
      }
    ]
  }
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
    keyVisualCue:
      'Rigid white/ivory PVC shaft with soft flexible neck flange and standard 15 mm white hub.',
    emergencyAction:
      'If blocked and suction catheter will not pass, cut ties and remove the entire tube immediately.'
  },
  {
    id: 'hw-bivona-tts',
    name: 'Bivona TTS (Tight-to-Shaft) Cuffed',
    tag: 'Sterile-Water Cuff',
    tagColor: 'bg-sky-50 text-sky-700 border-sky-200',
    imageUrl: '',
    cuffType: 'Silicone cuff — inflated with STERILE WATER (not air)',
    innerCannula: 'None (Single-lumen)',
    keyVisualCue:
      'Soft wire-reinforced silicone shaft with a clear pilot balloon & white inflation valve.',
    emergencyAction:
      'Aspirate pilot balloon completely with an empty syringe BEFORE removing a blocked tube.'
  },
  {
    id: 'hw-bivona-flextend',
    name: 'Bivona FlexTend (Extended Proximal Shaft)',
    tag: 'Infant / Chin-Clearance Tube',
    tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    imageUrl: '',
    cuffType: 'Uncuffed or TTS Sterile-Water Cuff',
    innerCannula: 'None (Single-lumen)',
    keyVisualCue:
      'Extra-long flexible extension tubing between the neck flange and the 15 mm BVM hub to keep circuits away from a baby’s chin.',
    emergencyAction:
      'Attach BVM directly to the extended 15 mm hub; check the extended limb for kinking under chin folds.'
  },
  {
    id: 'hw-speaking-valve',
    name: 'Passy-Muir / One-Way Speaking Valve',
    tag: 'STRIP FIRST IN DISTRESS',
    tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
    imageUrl: '',
    cuffType: 'Hub Attachment (Fits onto 15 mm connector)',
    innerCannula: 'One-way silicone diaphragm (Air IN only)',
    keyVisualCue:
      'Brightly coloured (aqua/purple/clear) low-profile cap attached to the tracheostomy hub.',
    emergencyAction:
      'TWIST OFF IMMEDIATELY in any breathing difficulty — it blocks exhalation if upper airway swells.'
  },
  {
    id: 'hw-hme-filter',
    name: 'Swedish Nose / HME Humidifier Filter',
    tag: 'REMOVE IF WET OR CLOGGED',
    tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
    imageUrl: '',
    cuffType: 'Hub Attachment (T-piece or cylindrical foam filter)',
    innerCannula: 'Hygroscopic foam / paper filter element',
    keyVisualCue:
      'Lightweight translucent T-shaped or round plastic housing with internal sponge/paper media and oxygen side-port.',
    emergencyAction:
      'Remove immediately during emergencies — sputum-soaked HME filters act like a solid cork.'
  }
];

const TUBE_TAG_COLOR_OPTIONS = [
  { label: 'Emerald (Common)', value: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Sky Blue (Water Cuff)', value: 'bg-sky-50 text-sky-700 border-sky-200' },
  { label: 'Indigo (Specialised)', value: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { label: 'Rose Red (Strip First)', value: 'bg-rose-50 text-rose-700 border-rose-200' },
  { label: 'Amber (Caution)', value: 'bg-amber-50 text-amber-800 border-amber-200' }
];

function normalizeTubeHardwareItem(hw = {}) {
  return {
    id: hw.id || `hw-${Date.now()}`,
    name: hw.name || 'Unnamed Tube / Hardware',
    tag: hw.tag || hw.manufacturer || 'Paediatric Airway',
    tagColor: hw.tagColor || 'bg-emerald-50 text-emerald-700 border-emerald-200',
    imageUrl: hw.imageUrl || hw.photoUrl || '',
    cuffType: hw.cuffType || 'Uncuffed',
    innerCannula: hw.innerCannula || 'None (Single-lumen)',
    keyVisualCue: hw.keyVisualCue || hw.visualCues || '',
    emergencyAction: hw.emergencyAction || hw.roadsideAction || ''
  };
}

function isValidClassicPathwayList(list) {
  return (
    Array.isArray(list) &&
    list.length > 0 &&
    list.every((p) => p && Array.isArray(p.nodes) && p.nodes.length > 0)
  );
}

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

const INITIAL_LEARNING_MODULES = [
  {
    id: 'mod-anatomy',
    title: 'Anatomy: Tracheostomy vs. Laryngectomy',
    duration: '6 min read',
    category: 'Airway Fundamentals',
    settingTags: ['pre-hospital', 'in-patient', 'community'],
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
    summary:
      'Understand the anatomical difference between a patent upper airway (Green) and a neck-only airway (Red).',
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
        pearl:
          'Always check the colour of the child’s NTSP Bedhead Sign or caregiver emergency sheet inside their Go-Bag on arrival.',
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
            caption:
              'Green indicates a potentially patent upper airway; Red indicates a laryngectomy or isolated neck-only stoma.',
            url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=900&q=80'
          }
        ],
        videos: [
          {
            id: 'vid-anat-1',
            title: 'Visual Guide: Dual Airway vs. Stoma-Only Airway',
            duration: '03:45',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            description:
              'Animated sagittal comparison showing airflow pathways in standard tracheostomy versus complete upper airway disconnection.',
            transcript:
              '00:00 Identify NTSP Bedhead Sign colour • 01:15 Green pathway dual-site oxygen (face + neck) • 02:30 Red pathway neck-only stoma oxygenation without stoma occlusion.'
          }
        ]
      },
      {
        id: 'sec-anat-2',
        heading: 'Green Pathway: Tracheostomy (Upper Airway Connected)',
        layout: 'media-left',
        body: `In almost all children with a tracheostomy, the larynx remains present above the stoma. Even if the child has subglottic stenosis or tracheomalacia, oxygen can usually pass from the mouth and nose into the lungs once a blocked tube is removed.\n\n1. Remove any speaking valve, cap, or HME filter immediately.\n2. Apply high-flow oxygen to both the mouth/nose and the tracheostomy.\n3. If the tube is removed and you ventilate via a face mask, **gently occlude the open neck stoma with sterile gauze** so positive-pressure air does not escape out of the neck.`,
        calloutType: 'warning',
        pearl:
          'Avoid hyperextending an infant’s neck—keep the head in neutral alignment with a thin shoulder roll so the soft cartilage does not kink.',
        miniCase: {
          scenario:
            'Bedside Scenario: You remove a blocked 3.5 mm tube from a 10-month-old on the Green Pathway. A spare tube will not pass, so you begin oral BVM ventilation, but the chest fails to rise and air hisses from the neck.',
          options: [
            'Hyperextend the infant’s neck further to open the trachea',
            'Firmly occlude the open neck stoma with sterile gauze while ventilating via the face mask',
            'Insert a rigid Yankauer sucker into the stoma'
          ],
          correctIndex: 1,
          feedback:
            'Correct! In a Green Pathway child, positive-pressure breaths delivered via the mouth/nose will escape out of an open neck stoma unless occluded with sterile gauze.'
        },
        images: [
          {
            id: 'img-anat-2',
            title: 'Dual-Site Oxygen Delivery & Stoma Occlusion',
            caption:
              'Apply oxygen to both face and neck during assessment. Occlude the stoma with gauze when delivering oral BVM breaths.',
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
        pearl:
          'Keep a circular neonatal silicone face mask (size 0 or 1) easily accessible in your paediatric airway pouch for direct stoma ventilation.',
        images: [],
        videos: [
          {
            id: 'vid-anat-2',
            title: 'Ventilating an Open Neck Stoma with a Neonatal Mask',
            duration: '02:20',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            description:
              'Demonstration of achieving an airtight seal over a paediatric neck stoma using a circular neonatal silicone mask.',
            transcript:
              '00:00 Position circular neonatal mask over stoma • 01:05 Maintain neutral neck alignment • 01:45 Verify chest rise and waveform EtCO2.'
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
        explanation:
          'Covering the open stoma with sterile gauze prevents positive-pressure breaths delivered via the mouth/nose from escaping out of the neck.'
      },
      {
        q: 'What does a Red Bedhead Sign indicate to attending paramedics?',
        options: [
          'Oxygenate and ventilate via the neck stoma ONLY — no upper airway route exists',
          'The tracheostomy cuff is filled with sterile water',
          'The child only requires nasal cannula oxygen'
        ],
        correct: 0,
        explanation:
          'A Red pathway indicates no functional connection between the mouth/nose and lungs; all oxygenation must occur via the neck.'
      },
      {
        q: 'Why should you avoid hyperextending an infant’s neck during airway opening?',
        options: [
          'It loosens the Velcro neck ties',
          'The infant trachea is soft and cartilaginous, and hyperextension can kink or collapse the airway',
          'It prevents capnography from reading accurately'
        ],
        correct: 1,
        explanation:
          'Maintain neutral head alignment with a small roll under the shoulders to keep the soft paediatric trachea open.'
      }
    ]
  },
  {
    id: 'mod-bedhead',
    title: 'Reading the NTSP Bedhead Sign & Tubes',
    duration: '7 min read',
    category: 'Equipment & Preparation',
    settingTags: ['pre-hospital', 'community'],
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
    summary:
      'Learn how to quickly read the bedside emergency card, identify single-lumen paediatric tubes, and remove speaking valves.',
    learningObjectives: [
      'Extract tube inner diameter (mm), suction catheter French size, and safe suction depth (cm) from an NTSP Bedhead Sign.',
      'Explain why small paediatric tracheostomy tubes (2.5–5.0 mm) are single-lumen without removable inner cannulae.',
      'Identify and safely remove speaking valves, HME filters, and sterile-water cuffs prior to emergency tube removal.'
    ],
    sections: [
      {
        id: 'sec-bed-1',
        heading: '3 Key Numbers on the Bedhead Sign',
        layout: 'stacked',
        body: `When arriving at the bedside, look immediately for three critical figures on the child’s emergency sheet:\n\n1. **Tube Inner Diameter (ID in mm):** e.g. 4.0 mm (determines suction catheter & spare tube size).\n2. **Suction Catheter Size & Depth:** e.g. 8 Fr catheter to 8.0 cm pre-measured depth.\n3. **Upper Airway Status:** Documents vocal cord patency or subglottic narrowing.`,
        calloutType: 'pearl',
        pearl:
          'A child’s Emergency Tracheostomy Go-Bag travels everywhere with them and holds a copy of their Bedhead Sign plus spare tubes.',
        comparisonTable: [
          { label: 'Bivona® TTS Silicone Cuff', value: 'Inflate & deflate with STERILE WATER only (never air or saline)' },
          { label: 'Shiley™ Paediatric Cuff', value: 'PVC air-filled cuff — aspirate air via pilot balloon before removal' },
          { label: 'Speaking Valve (Passy-Muir)', value: 'One-way valve — MUST deflate cuff fully & strip first in distress' }
        ],
        images: [
          {
            id: 'img-bed-1',
            title: 'Paediatric Emergency Tracheostomy Go-Bag',
            caption:
              'Contains same-size spare tube, 0.5 mm smaller downsize tube, suction catheters, blunt scissors, and emergency card.',
            url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=900&q=80'
          }
        ],
        videos: []
      },
      {
        id: 'sec-bed-2',
        heading: 'Single-Lumen Paediatric Tubes & Speaking Valves',
        layout: 'stacked',
        body: `Unlike adult tracheostomy tubes, neonatal and small paediatric tubes (**2.5 mm to 5.0 mm ID**) are almost always **single-lumen tubes without an inner cannula**.\n\n- **Strip All Attachments First:** Many children wear a colourful one-way speaking valve (e.g. Passy-Muir) or an HME filter on the 15 mm hub.\n- **Eliminate Hidden Obstruction:** In any respiratory distress, twist off all attachments down to the bare white 15 mm tracheostomy hub immediately.\n- **Check for Sterile Water Cuffs:** Silicone Bivona TTS cuffs are often inflated with sterile water rather than air—aspirate completely with a syringe before removing a blocked tube.`,
        calloutType: 'warning',
        pearl:
          'A speaking valve is a one-way valve—it lets air in but blocks exhalation through the tube. If the upper airway swells, severe air trapping occurs unless removed.',
        flashcard: {
          front: 'Quick Recall: Why must a Passy-Muir speaking valve be twisted off immediately in respiratory distress?',
          back: 'It is a one-way inspiratory valve. If the child’s upper airway narrows or swells, air enters through the valve but cannot escape, causing rapid air trapping and barotrauma.'
        },
        miniCase: {
          scenario:
            'Bedside Scenario: You are called to a 2-year-old with a 4.0 mm Bivona TTS tracheostomy tube who is cyanosed. A suction catheter will not pass, and you notice a small pilot balloon hanging from the flange.',
          options: [
            'Pull the tube out immediately without touching the pilot balloon',
            'Aspirate the pilot balloon completely with a syringe to deflate the sterile-water cuff, reassess, and prepare to remove the tube',
            'Inject 5 ml of air into the pilot balloon'
          ],
          correctIndex: 1,
          feedback:
            'Correct! Bivona TTS cuffs are filled with sterile water. Deflating the cuff may allow immediate airflow around the blocked tube and prevents tracheal trauma during tube removal.'
        },
        images: [
          {
            id: 'img-bed-2',
            title: 'Stripping Speaking Valves & HME Attachments',
            caption:
              'Always twist off speaking valves or HME filters first before assessing airflow or passing a suction catheter.',
            url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=80'
          }
        ],
        videos: [
          {
            id: 'vid-bed-1',
            title: 'Equipment Walkthrough: Paediatric Tubes & One-Way Valves',
            duration: '04:30',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            description:
              'Hands-on overview of uncuffed Shiley and water-cuffed Bivona TTS paediatric tubes, obturators, and speaking valves.',
            transcript:
              '00:00 Single-lumen paediatric tube anatomy • 01:50 Sterile-water Bivona TTS cuffs • 03:10 Stripping speaking valves & HMEs.'
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
        explanation:
          'Removing all hub attachments immediately eliminates clogged HME filters and one-way expiratory valves.'
      },
      {
        q: 'Do standard 3.5 mm ID paediatric tracheostomy tubes have a removable inner cannula?',
        options: [
          'No — they are single-lumen tubes to maximise internal diameter',
          'Yes — all paediatric tubes contain dual inner cannulae',
          'Only when a speaking valve is attached'
        ],
        correct: 0,
        explanation:
          'Small paediatric tubes are single-lumen; if blocked and un-suctionable, the entire tube must be removed.'
      },
      {
        q: 'If a paediatric Bivona TTS tube has a pilot balloon, what might the cuff be inflated with?',
        options: [
          'Sterile water or air (aspirate completely with a syringe to deflate)',
          'Saline mixed with adrenaline',
          'Carbon dioxide'
        ],
        correct: 0,
        explanation:
          'Silicone Bivona TTS cuffs are often inflated with sterile water because silicone is gas-permeable; aspirate with a syringe.'
      }
    ]
  },
  {
    id: 'mod-suction',
    title: 'Suctioning & Emergency Tube Change',
    duration: '8 min read',
    category: 'Clinical Skills',
    settingTags: ['pre-hospital', 'in-patient'],
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
    summary:
      'Master the suction catheter sizing rule (ID × 2), safe suction depth, and the two-attempt emergency tube replacement protocol.',
    learningObjectives: [
      'Calculate the correct flexible suction catheter French size using the Tube ID (mm) × 2 rule.',
      'Perform pre-measured tracheal suctioning within the safe 5–10 second time window without carinal trauma.',
      'Execute the two-step emergency tube replacement protocol (same-size tube followed by 0.5 mm downsize) with immediate obturator removal.'
    ],
    sections: [
      {
        id: 'sec-suc-1',
        heading: 'Suction Catheter Sizing: Tube ID (mm) × 2 = French (Fr)',
        layout: 'stacked',
        body: `Double the tracheostomy tube internal diameter (mm) to find the maximum French catheter size.\n\n- **Formula:** Tube ID (mm) × 2 = Catheter Size (Fr). For example, a 4.0 mm tube requires an **8 Fr** catheter.\n- **Pre-Measured Depth:** Only advance the catheter to the child’s documented safe depth (typically 6 to 11 cm) so you do not traumatise the carina or trigger vagal bradycardia.\n- **Time Limit:** Apply suction only while withdrawing for **5 to 10 seconds** maximum.`,
        calloutType: 'warning',
        pearl:
          'Never use a rigid Yankauer sucker inside a tracheostomy tube—only use flexible, centimetre-graduated suction catheters.',
        comparisonTable: [
          { label: '3.0 – 3.5 mm Tube (Infant)', value: '6 – 7 Fr catheter • Safe depth ~6.0 – 7.5 cm • Downsize by 0.5 mm' },
          { label: '4.0 – 4.5 mm Tube (Toddler)', value: '8 – 10 Fr catheter • Safe depth ~7.5 – 9.5 cm • Downsize by 0.5 mm' },
          { label: '5.0 – 6.0 mm Tube (Child)', value: '10 – 12 Fr catheter • Safe depth ~9.5 – 12.5 cm • Downsize by 0.5 mm' }
        ],
        flashcard: {
          front: 'Quick Recall: What is the formula for sizing a paediatric suction catheter & maximum suction pass time?',
          back: 'Tube Inner Diameter (mm) × 2 = French (Fr) catheter size (e.g., 4.0 mm → 8 Fr). Apply suction on withdrawal only for 5–10 seconds maximum.'
        },
        images: [
          {
            id: 'img-suc-1',
            title: 'Pre-Measured Graduated Suction Catheter',
            caption:
              'Match centimetre markings on the catheter to the child’s documented safe suction depth.',
            url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=900&q=80'
          }
        ],
        videos: []
      },
      {
        id: 'sec-suc-2',
        heading: 'The Obturator Rule During Emergency Tube Replacement',
        layout: 'stacked',
        body: `When inserting a spare tube, the solid plastic obturator sits inside the tube to guide its curved tip smoothly through the stoma.\n\n1. Lubricate the spare tube with water-soluble gel.\n2. Slide into the stoma following a gentle downward curve.\n3. **Remove the obturator immediately** once the flange reaches the neck skin — the child cannot breathe while the obturator is inside.\n4. If the same-size tube will not slide in easily, do not force it—immediately attempt the **0.5 mm smaller downsize tube**.`,
        calloutType: 'pearl',
        pearl:
          'Confirm successful tube placement using waveform capnography (EtCO2), bilateral chest rise, and smooth passage of a suction catheter.',
        miniCase: {
          scenario:
            'Bedside Scenario: During an emergency tube change, you lubricate the same-size spare tube with the obturator inside and guide it into the stoma, but you meet firm resistance halfway in.',
          options: [
            'Push firmly until the flange sits flush against the skin',
            'Stop immediately, withdraw it, and attempt insertion with the 0.5 mm smaller downsize spare tube',
            'Leave the tube halfway in and attach the BVM over the obturator'
          ],
          correctIndex: 1,
          feedback:
            'Correct! Never force a tracheostomy tube into a narrowing stoma (risk of creating a false passage). Switch immediately to the 0.5 mm downsize tube, and always remove the obturator as soon as it enters.'
        },
        images: [],
        videos: [
          {
            id: 'vid-suc-1',
            title: 'Step-by-Step: Safe Suctioning & Obturator Removal',
            duration: '05:50',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            description:
              'Real-time simulation of blocked tube removal, stoma insertion using a curved motion, and immediate obturator withdrawal.',
            transcript:
              '00:00 Prepare same-size and 0.5 mm downsize tubes • 01:40 Curved downward insertion with obturator • 02:15 Immediate obturator withdrawal • 03:30 Waveform EtCO2 confirmation.'
          }
        ]
      }
    ],
    quiz: [
      {
        q: 'A child has a 4.0 mm ID tracheostomy tube. What is the recommended suction catheter size?',
        options: ['Size 8 Fr', 'Size 14 Fr', 'Rigid Yankauer catheter'],
        correct: 0,
        explanation:
          'Double the internal diameter in mm (4.0 × 2 = 8 Fr) so the catheter clears secretions without totally occluding the tube.'
      },
      {
        q: 'What must you do immediately after sliding a replacement tube (with obturator) into the stoma?',
        options: [
          'Leave the obturator inside to keep the tube rigid',
          'Remove the obturator immediately so the lumen is open for breathing and ventilation',
          'Instil 10 ml of water down the tube'
        ],
        correct: 1,
        explanation:
          'The obturator completely blocks the lumen; remove it immediately once the tube is seated in the stoma.'
      },
      {
        q: 'What is the maximum recommended duration for a single tracheal suction pass in a child?',
        options: ['5 to 10 seconds', '30 to 45 seconds', '60 seconds'],
        correct: 0,
        explanation:
          'Suctioning removes oxygen as well as secretions; limit each pass to 5–10 seconds.'
      }
    ]
  },
  {
    id: 'mod-tif-bleed',
    title: 'Tracheo-Innominate Fistula & Stomal Haemorrhage',
    duration: '5 min read',
    category: 'Vascular Red Flag',
    settingTags: ['pre-hospital', 'in-patient'],
    targetAudience: 'ENT Trainees, Anaesthetists, Paediatricians, ED Clinicians & Paramedics',
    facultyName: 'Paediatric Airway & Pre-Hospital Education Group',
    facultyCredentials: 'Consultant Paediatric ENT & Specialist Pre-Hospital Faculty',
    peerReviewedDate: '2026-02-18',
    coiDisclosure: 'None declared — independent educational resource with zero commercial sponsorship.',
    references: [
      {
        title: 'NTSP Red Flag Clinical Alerts: Tracheostomy Bleeding & Sentinel Bleed',
        url: 'https://www.tracheostomy.org.uk/healthcare-staff/emergency-care/paediatric-emergency-algorithms'
      }
    ],
    summary:
      'Differentiating benign granulation oozing from life-threatening sentinel bleeds and executing emergency tamponade.',
    learningObjectives: [
      'Differentiate benign stomal granulation or suction trauma from a red-flag sentinel bleed for a tracheo-innominate fistula (TIF).',
      'Perform immediate bedside tamponade (cuff hyperinflation with anterior traction and the Utley manoeuvre) while mobilising ENT & Cardiothoracics.'
    ],
    sections: [
      {
        id: 'sec-tif-1',
        heading: 'Recognising the Sentinel Bleed',
        layout: 'stacked',
        body: `A tracheo-innominate artery fistula (TIF) occurs when a low-placed tracheostomy tube or high-pressure cuff erodes anteriorly into the brachiocephalic (innominate) artery.\n\n- **Sentinel Bleed Warning:** Up to 50% of cases present first with a brief, self-limiting bright red bleed (**>10 mL**) days to weeks post-tracheostomy.\n- **High-Risk Window:** Peak incidence is **3 days to 6 weeks** post-insertion, though late TIF can occur at any time.\n- **Action:** Never reassure and discharge a child with unexplained bright red stomal bleeding without urgent ENT evaluation.`,
        calloutType: 'warning',
        pearl:
          'Any >10 mL bright red bleed via or around a tracheostomy must be treated as a potential sentinel bleed until assessed by ENT.',
        comparisonTable: [
          { label: 'Benign Suction Trauma', value: 'Blood-streaked mucus only; stops immediately; well child' },
          { label: 'Sentinel TIF Bleed', value: '>10 mL bright red blood; may stop spontaneously — URGENT ENT review' },
          { label: 'Catastrophic TIF', value: 'Massive pulsatile arterial bleeding + tube pulsation — immediate tamponade & theatre' }
        ],
        flashcard: {
          front: 'Quick Recall: What is the Utley Manoeuvre for catastrophic tracheostomy haemorrhage?',
          back: 'After securing the airway orally, insert a gloved finger through the stoma and compress the innominate artery anteriorly against the posterior sternum continuously en route to theatre.'
        },
        images: [],
        videos: []
      },
      {
        id: 'sec-tif-2',
        heading: 'Immediate Tamponade: Cuff Hyperinflation & Utley Manoeuvre',
        layout: 'stacked',
        body: `In catastrophic pulsatile haemorrhage, do **NOT** blindly pull the tube out unless an oral airway is secured.\n\n1. **Over-inflate the cuff** (if cuffed tube in situ) and apply gentle anterior traction to tamponade the bleeding vessel against the sternum.\n2. **Call 2222 / Pre-Alert A&E Resus, ENT, Cardiothoracics & Major Haemorrhage Protocol** immediately.\n3. If exsanguinating haemorrhage continues once orally intubated, insert a gloved finger into the stoma and compress forward against the sternum (**Utley manoeuvre**) continuously all the way to theatre.`,
        calloutType: 'pearl',
        pearl:
          'Pre-alert A&E Resus, ENT, Cardiothoracic Surgery, and activate the Major Haemorrhage Protocol early.',
        miniCase: {
          scenario:
            'Bedside Scenario: A 5-year-old who had a tracheostomy formed 18 days ago coughs up ~15 mL of bright red blood via the tube at home. By the time you arrive, bleeding has stopped and observations are completely normal.',
          options: [
            'Reassure parents that it is mild suction trauma and arrange routine GP follow-up',
            'Treat as a sentinel bleed for tracheo-innominate fistula and transport urgently to A&E with ENT pre-alerted',
            'Perform deep vigorous suctioning to clear all residual clots'
          ],
          correctIndex: 1,
          feedback:
            'Correct! Never discharge a child after >10 mL bright red stomal bleeding within 3 days–6 weeks of tracheostomy, and never disturb a fragile clot with deep suctioning. Pre-alert A&E & ENT urgently.'
        },
        images: [],
        videos: []
      }
    ],
    quiz: [
      {
        q: 'During massive pulsatile bleeding from a cuffed tracheostomy tube, what is the immediate bedside tamponade manoeuvre?',
        options: [
          'Deflate the cuff and remove the tube immediately',
          'Over-inflate the cuff and apply gentle anterior traction while alerting ENT/Cardiothoracics',
          'Perform vigorous deep suctioning to clear all clots'
        ],
        correct: 1,
        explanation:
          'Over-inflating the cuff with gentle anterior traction compresses the innominate artery against the posterior sternum as a bridge to emergency surgical control.'
      },
      {
        q: 'A child 3 weeks post-tracheostomy has a self-limiting ~15 mL bright red bleed from the stoma. What is the safest management?',
        options: [
          'Observe at home if observations are normal',
          'Treat as a sentinel bleed for tracheo-innominate fistula and transfer urgently to A&E with ENT pre-alert',
          'Place a speaking valve to increase PEEP'
        ],
        correct: 1,
        explanation:
          'A sentinel bleed often stops briefly before catastrophic haemorrhage occurs; urgent transfer and ENT review are essential.'
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
      const relNum = Number(e.relevanceRating || 0);
      const qualNum = Number(e.qualityRating || 0);
      const objNum = Number(e.objectivesRating || e.overallRating || 0);
      const ovNum = Number(e.overallRating || 0);
      return `
        <tr style="background-color:${rowBg};">
          <td style="border:1px solid #CBD5E1;padding:8px;text-align:center;font-weight:bold;white-space:nowrap;mso-number-format:'\\@';">${escapeHtmlForExcel(e.submittedAt)}</td>
          <td style="border:1px solid #CBD5E1;padding:8px;font-weight:600;color:#0F172A;">${escapeHtmlForExcel(e.moduleTitle)}</td>
          <td style="border:1px solid #CBD5E1;padding:8px;text-align:center;mso-number-format:'0';">${relNum}</td>
          <td style="border:1px solid #CBD5E1;padding:8px;text-align:center;mso-number-format:'0';">${qualNum}</td>
          <td style="border:1px solid #CBD5E1;padding:8px;text-align:center;mso-number-format:'0';">${objNum}</td>
          <td style="border:1px solid #CBD5E1;padding:8px;text-align:center;font-weight:bold;background-color:${sc.bg};color:${sc.fg};mso-number-format:'0';">${ovNum}</td>
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
            <td colspan="2" style="border:1px solid #A7F3D0;padding:10px;font-weight:bold;color:#065F46;mso-number-format:'\\@';">Total Responses (Last 6m): ${total}</td>
            <td colspan="2" style="border:1px solid #A7F3D0;padding:10px;font-weight:bold;color:#065F46;mso-number-format:'\\@';">Avg Relevance: ${avgRel} out of 5</td>
            <td colspan="1" style="border:1px solid #A7F3D0;padding:10px;font-weight:bold;color:#065F46;mso-number-format:'\\@';">Avg Quality: ${avgQual} out of 5</td>
            <td colspan="2" style="border:1px solid #A7F3D0;padding:10px;font-weight:bold;color:#065F46;mso-number-format:'\\@';">Avg Overall Score: ${avgOverall} out of 5</td>
          </tr>
          <tr><td colspan="7" style="height:10px;"></td></tr>
          <tr style="background-color:#0F172A;color:#FFFFFF;">
            <th style="border:1px solid #0F172A;padding:10px;text-align:center;">Date</th>
            <th style="border:1px solid #0F172A;padding:10px;text-align:left;">Module / Scope</th>
            <th style="border:1px solid #0F172A;padding:10px;text-align:center;">Relevance (1-5)</th>
            <th style="border:1px solid #0F172A;padding:10px;text-align:center;">Quality (1-5)</th>
            <th style="border:1px solid #0F172A;padding:10px;text-align:center;">Objectives (1-5)</th>
            <th style="border:1px solid #0F172A;padding:10px;text-align:center;">Overall Score (1-5)</th>
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
      "Educational simulation only. Always verify spare tube sizes (same size + 0.5 mm downsize) from the child's emergency go-bag.",
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

function cleanStepTitle(rawTitle = '') {
  return String(rawTitle || '').replace(/^[0-9]+[A-Za-z]?\.\s*/, '').trim();
}

function getThemeStyles(theme) {
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
  // Top-level Navigation: 'pathways' | 'learning' | 'admin'
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
      const saved = localStorage.getItem('pt_pathways_classic_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isValidClassicPathwayList(parsed)) return parsed;
      }
      return INITIAL_PATHWAYS;
    } catch {
      return INITIAL_PATHWAYS;
    }
  });

  const [tubeHardwareList, setTubeHardwareList] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_tube_hw_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeTubeHardwareItem);
        }
      }
      return INITIAL_TUBE_HARDWARE_GUIDE;
    } catch {
      return INITIAL_TUBE_HARDWARE_GUIDE;
    }
  });

  const [learningModules, setLearningModules] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_modules_rich_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeRichLearningModule);
        }
      }
      return INITIAL_LEARNING_MODULES.map(normalizeRichLearningModule);
    } catch {
      return INITIAL_LEARNING_MODULES.map(normalizeRichLearningModule);
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

  const [siteNotices, setSiteNotices] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_site_notices_v1');
      return saved ? { ...INITIAL_SITE_NOTICES, ...JSON.parse(saved) } : INITIAL_SITE_NOTICES;
    } catch {
      return INITIAL_SITE_NOTICES;
    }
  });

  const [adminUsers, setAdminUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_admin_users_v1');
      const parsed = saved ? JSON.parse(saved) : INITIAL_ADMIN_USERS;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ADMIN_USERS;
    } catch {
      return INITIAL_ADMIN_USERS;
    }
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_audit_logs_v1');
      const parsed = saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
      return Array.isArray(parsed) ? parsed : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pt_pathways_classic_v4', JSON.stringify(pathways));
      localStorage.setItem('pt_tube_hw_v2', JSON.stringify(tubeHardwareList));
      localStorage.setItem('pt_modules_rich_v3', JSON.stringify(learningModules));
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
      localStorage.setItem('pt_site_notices_v1', JSON.stringify(siteNotices));
      localStorage.setItem('pt_admin_users_v1', JSON.stringify(adminUsers));
      localStorage.setItem('pt_audit_logs_v1', JSON.stringify(auditLogs.slice(0, 40)));
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
    externalResources,
    siteNotices,
    adminUsers,
    auditLogs
  ]);

  // Global Search State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Classic On-Call Pathway Runner & 2-Minute CPR Timer State
  const [activePathwayId, setActivePathwayId] = useState(null);
  const [pathwayViewMode, setPathwayViewMode] = useState('interactive'); // 'interactive' | 'overview'
  const [currentNodeId, setCurrentNodeId] = useState('gov-check');
  const [nodeHistory, setNodeHistory] = useState(['gov-check']);
  const [checkedItems, setCheckedItems] = useState({});
  const [flowchartInspectNode, setFlowchartInspectNode] = useState(null);
  const [showPathwayRefs, setShowPathwayRefs] = useState(false);

  const [showCprTimer, setShowCprTimer] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Classic Roadside Tool Modal State: 'calculator' | 'hardware' | 'troubleshoot' | 'checklist' | 'handover' | null
  const [activeToolModal, setActiveToolModal] = useState(null);
  const [highlightedTubeId, setHighlightedTubeId] = useState(null);
  const [selectedTroubleshootId, setSelectedTroubleshootId] = useState('ts-high-resistance');
  const [selectedTubeIdSize, setSelectedTubeIdSize] = useState('4.0');
  const [bagChecked, setBagChecked] = useState({});

  // Classic Paediatric A&E / ENT Pre-Alert Builder State
  const [handoverForm, setHandoverForm] = useState(createEmptyHandoverForm);
  const [showHandoverCpr, setShowHandoverCpr] = useState(false);
  const [handoverCopied, setHandoverCopied] = useState(false);

  // Learning Modules & CPD Certificate State
  const [moduleSettingFilter, setModuleSettingFilter] = useState('all'); // 'all' | 'pre-hospital' | 'in-patient' | 'community'
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [maxReachedSectionIndex, setMaxReachedSectionIndex] = useState(0);
  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const [quizAttemptSeed, setQuizAttemptSeed] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [moduleNightMode, setModuleNightMode] = useState(false);
  const [moduleLargeText, setModuleLargeText] = useState(false);
  const [flippedFlashcards, setFlippedFlashcards] = useState({});
  const [miniCaseAnswers, setMiniCaseAnswers] = useState({});
  const [miniCaseRevealed, setMiniCaseRevealed] = useState({});
  const [expandedVideoTranscripts, setExpandedVideoTranscripts] = useState({});
  const [showFacultyGovernanceBox, setShowFacultyGovernanceBox] = useState(false);
  const [completedModules, setCompletedModules] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_completed_mods_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // CPD Certificate & Reflective Practice Journal State (Local Only — Zero PII in Cloud)
  const [cpdClinicianName, setCpdClinicianName] = useState('');
  const [cpdRegNumber, setCpdRegNumber] = useState('');
  const [cpdKeyPointsLearned, setCpdKeyPointsLearned] = useState('');
  const [cpdPracticeChange, setCpdPracticeChange] = useState('');
  const [showCpdModal, setShowCpdModal] = useState(false);

  // Course Feedback, Website Feedback, External Resources & Governance Modal State
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
  const [showGovernanceModal, setShowGovernanceModal] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState('disclaimer'); // 'disclaimer' | 'copyright' | 'mhra' | 'terms'

  // ==========================================
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
  // FULL-SCREEN ADMIN CONTENT MANAGER STATE
  // ==========================================
  const [isAdminSignedIn, setIsAdminSignedIn] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState(null);
  const [adminEmailInput, setAdminEmailInput] = useState('ent.lead@nhs.net');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminTab, setAdminTab] = useState('pathways'); // 'pathways' | 'modules' | 'tube-id' | 'sims' | 'feedback' | 'resources' | 'notices' | 'team'
  const [adminFeedbackSubTab, setAdminFeedbackSubTab] = useState('course'); // 'course' | 'website'
  const [cmsNotification, setCmsNotification] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [ownProfileForm, setOwnProfileForm] = useState({
    name: 'Clinical Airway Lead',
    email: 'ent.lead@nhs.net',
    newPassword: ''
  });
  const [newAdminForm, setNewAdminForm] = useState({
    name: '',
    email: '',
    role: 'Content Editor',
    password: ''
  });
  const [noticesDraft, setNoticesDraft] = useState(siteNotices);

  useEffect(() => {
    setNoticesDraft(siteNotices);
  }, [siteNotices]);

  const notifyCms = (msg) => {
    setCmsNotification(msg);
    setTimeout(() => setCmsNotification(null), 4000);
  };

  // Admin Pathways Editor State
  const [adminPathwayId, setAdminPathwayId] = useState('ntsp-green');
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [newNodeForm, setNewNodeForm] = useState({
    title: '',
    subtitle: '',
    checklistText: '',
    criticalNote: '',
    question: '',
    yesLabel: 'Yes',
    yesId: '',
    noLabel: 'No',
    noId: '',
    nextId: ''
  });
  const [newRefDraft, setNewRefDraft] = useState({ title: '', source: '', url: '' });
  const [showNewPathwayModal, setShowNewPathwayModal] = useState(false);
  const [newPathwayForm, setNewPathwayForm] = useState({
    title: '',
    subtitle: '',
    category: 'extra',
    theme: 'amber',
    badge: 'Routine & Secondary Care'
  });

  // Admin Learning Modules Editor State (Rich Content, Tables, Media, Flashcards, Mini-Cases & Quiz)
  const [adminModuleId, setAdminModuleId] = useState('mod-anatomy');
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
  const [uploadingMediaType, setUploadingMediaType] = useState(null); // 'image' | 'video' | null
  const [uploadProgressPct, setUploadProgressPct] = useState(0);
  const [newObjectiveDraft, setNewObjectiveDraft] = useState('');
  const [newQuizDraft, setNewQuizDraft] = useState({
    q: '',
    opt0: '',
    opt1: '',
    opt2: '',
    correct: 0,
    explanation: ''
  });
  const [showNewModuleModal, setShowNewModuleModal] = useState(false);
  const [newModuleForm, setNewModuleForm] = useState({
    title: '',
    category: 'Clinical Skills',
    duration: '5 min read',
    summary: '',
    settingTags: ['pre-hospital', 'in-patient']
  });

  // Admin External Resources Form State
  const [resourceForm, setResourceForm] = useState({
    title: '',
    organisation: '',
    category: 'Emergency Guidelines',
    url: '',
    description: ''
  });

  // Admin Tube ID Editor State (Classic layout + Offline Photo Upload)
  const [editingTubeId, setEditingTubeId] = useState(null);
  const [tubeForm, setTubeForm] = useState({
    name: '',
    tag: '',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cuffType: '',
    innerCannula: '',
    keyVisualCue: '',
    emergencyAction: '',
    imageUrl: ''
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
    () => activePathway?.nodes?.find((n) => n.id === currentNodeId) || activePathway?.nodes?.[0] || null,
    [activePathway, currentNodeId]
  );

  const adminPathway = useMemo(
    () => pathways.find((p) => p.id === adminPathwayId) || pathways[0],
    [pathways, adminPathwayId]
  );

  const adminModule = useMemo(
    () => learningModules.find((m) => m.id === adminModuleId) || learningModules[0],
    [learningModules, adminModuleId]
  );

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
      const correctIdx =
        typeof qItem.correct === 'number'
          ? qItem.correct
          : typeof qItem.correctIndex === 'number'
          ? qItem.correctIndex
          : 0;
      const mapped = (qItem.options || []).map((text, origIdx) => ({
        text,
        isCorrect: origIdx === correctIdx
      }));
      for (let i = mapped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
      }
      return {
        q: qItem.q || qItem.question || '',
        options: mapped.map((m) => m.text),
        correct: mapped.findIndex((m) => m.isCorrect),
        explanation: qItem.explanation || ''
      };
    });
  }, [activeModule, quizAttemptSeed]);

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
        Array.isArray(st.ageGroups) && st.ageGroups.length > 0 ? st.ageGroups : ['all'];
      if (activeSim.supportsAgeSwitch === false) return true;
      return groups.includes('all') || groups.includes(simAgeGroup);
    });
  }, [activeSim, simAgeGroup]);

  const adminSelectedSim = useMemo(
    () => procedureSims.find((s) => s.id === adminSimId) || procedureSims[0] || null,
    [procedureSims, adminSimId]
  );

  // Global Search Memo (Pathways, Pathway Nodes, Modules, Tube ID, Airway Troubleshooting)
  const searchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) {
      return { pathways: [], steps: [], modules: [], hardware: [], troubleshoot: [] };
    }
    const matchedPathways = pathways.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.subtitle || '').toLowerCase().includes(q) ||
        (p.badge || '').toLowerCase().includes(q)
    );
    const matchedSteps = [];
    pathways.forEach((p) => {
      (p.nodes || []).forEach((node) => {
        const checklistText = (node.checklist || []).join(' ').toLowerCase();
        if (
          (node.title || '').toLowerCase().includes(q) ||
          (node.subtitle || '').toLowerCase().includes(q) ||
          (node.criticalNote || '').toLowerCase().includes(q) ||
          checklistText.includes(q)
        ) {
          matchedSteps.push({
            pathwayId: p.id,
            pathwayTitle: p.title,
            nodeId: node.id,
            node
          });
        }
      });
    });
    const matchedModules = learningModules.filter(
      (m) =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.summary || '').toLowerCase().includes(q) ||
        (m.sections || []).some(
          (s) =>
            (s.heading || '').toLowerCase().includes(q) ||
            (s.body || '').toLowerCase().includes(q)
        )
    );
    const matchedHardware = tubeHardwareList.filter(
      (hw) =>
        (hw.name || '').toLowerCase().includes(q) ||
        (hw.tag || '').toLowerCase().includes(q) ||
        (hw.cuffType || '').toLowerCase().includes(q) ||
        (hw.keyVisualCue || '').toLowerCase().includes(q) ||
        (hw.emergencyAction || '').toLowerCase().includes(q)
    );
    const matchedTroubleshoot = TROUBLESHOOTING_MATRIX.filter(
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
  // FIREBASE SYNC, TIMERS & PROCEDURE SIM EFFECTS
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
        const cleanEmail = u.email.toLowerCase();
        setAdminUsers((prev) => {
          const matched = prev.find((adm) => adm.email.toLowerCase() === cleanEmail);
          const resolved = matched || {
            id: u.uid,
            name: u.displayName || cleanEmail.split('@')[0],
            email: cleanEmail,
            role: 'Clinical Lead (Super Admin)',
            addedAt: new Date().toISOString().slice(0, 10)
          };
          setCurrentAdminUser(resolved);
          setOwnProfileForm({
            name: resolved.name,
            email: resolved.email,
            newPassword: ''
          });
          return matched ? prev : [...prev, resolved];
        });
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
            if (data.classicPathwaysJson) {
              const parsedPathways = JSON.parse(data.classicPathwaysJson);
              if (isValidClassicPathwayList(parsedPathways)) {
                setPathways(parsedPathways);
              }
            }
            if (data.richLearningModulesJson) {
              const parsedMods = JSON.parse(data.richLearningModulesJson);
              if (Array.isArray(parsedMods) && parsedMods.length > 0) {
                setLearningModules(parsedMods.map(normalizeRichLearningModule));
              }
            }
            if (data.tubeHardwareJson) {
              const parsedHw = JSON.parse(data.tubeHardwareJson);
              if (Array.isArray(parsedHw) && parsedHw.length > 0) {
                setTubeHardwareList(parsedHw.map(normalizeTubeHardwareItem));
              }
            }
            if (data.procedureSimsJson) {
              const parsedSims = JSON.parse(data.procedureSimsJson);
              if (Array.isArray(parsedSims) && parsedSims.length > 0) {
                setProcedureSims(parsedSims);
              }
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
            if (data.siteNoticesJson) {
              const parsedNotices = JSON.parse(data.siteNoticesJson);
              if (parsedNotices && typeof parsedNotices === 'object') {
                setSiteNotices({ ...INITIAL_SITE_NOTICES, ...parsedNotices });
              }
            }
            if (data.adminUsersJson) {
              const parsedAdmins = JSON.parse(data.adminUsersJson);
              if (Array.isArray(parsedAdmins) && parsedAdmins.length > 0) {
                setAdminUsers(parsedAdmins);
              }
            }
            if (data.auditLogsJson) {
              const parsedLogs = JSON.parse(data.auditLogsJson);
              if (Array.isArray(parsedLogs)) setAuditLogs(parsedLogs);
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
      if (overrides.pathways) {
        payload.classicPathwaysJson = JSON.stringify(overrides.pathways);
      }
      if (overrides.learningModules) {
        payload.richLearningModulesJson = JSON.stringify(overrides.learningModules);
      }
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
      if (overrides.siteNotices) {
        payload.siteNoticesJson = JSON.stringify(overrides.siteNotices);
      }
      if (overrides.adminUsers) {
        payload.adminUsersJson = JSON.stringify(overrides.adminUsers);
      }
      if (overrides.auditLogs) {
        payload.auditLogsJson = JSON.stringify(overrides.auditLogs.slice(0, 40));
      }
      await setDoc(bundleRef, payload, { merge: true });
      setCloudStatus('synced');
    } catch {
      setCloudStatus('offline');
    }
  };

  // Classic 2-Minute CPR Cycle Timer
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

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

  // Classic On-Call Pathway Navigation Handlers
  const handleOpenPathway = (pathwayId, specificNodeId = null) => {
    const target = pathways.find((p) => p.id === pathwayId);
    if (!target) return;
    setActiveTopTab('pathways');
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
    if (!activePathway) return;
    const startId = activePathway.startNodeId || activePathway.nodes[0]?.id;
    setCurrentNodeId(startId);
    setNodeHistory([startId]);
    setCheckedItems({});
  };

  const toggleChecklistItem = (nodeId, idx) => {
    const key = `${nodeId}-${idx}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Procedure Sim Age Switcher
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

  // Offline-Ready Canvas-Compressed Photo Uploader (No Wi-Fi needed once uploaded)
  const handlePhotoFileUpload = (file, onLoaded) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = ev.target?.result;
      if (typeof rawDataUrl !== 'string') return;
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

  // Course Feedback & Website Feedback Handlers
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

  // Admin: External Resources Handlers
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
    notifyCms('External resource added & synced.');
  };

  // Admin: Tube ID Handlers (Classic structure + Offline compressed photo upload)
  const resetTubeForm = () => {
    setEditingTubeId(null);
    setTubeForm({
      name: '',
      tag: '',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      cuffType: '',
      innerCannula: '',
      keyVisualCue: '',
      emergencyAction: '',
      imageUrl: ''
    });
  };

  const handleSaveTubeItem = (e) => {
    e.preventDefault();
    if (!tubeForm.name.trim()) return;
    const itemObj = {
      id: editingTubeId || `hw-${Date.now()}`,
      name: tubeForm.name.trim(),
      tag: tubeForm.tag.trim() || 'Paediatric Airway',
      tagColor: tubeForm.tagColor || 'bg-emerald-50 text-emerald-700 border-emerald-200',
      cuffType: tubeForm.cuffType.trim() || 'Uncuffed',
      innerCannula: tubeForm.innerCannula.trim() || 'None (Single-lumen)',
      keyVisualCue: tubeForm.keyVisualCue.trim(),
      emergencyAction: tubeForm.emergencyAction.trim(),
      imageUrl: tubeForm.imageUrl || ''
    };
    const nextList = editingTubeId
      ? tubeHardwareList.map((item) => (item.id === editingTubeId ? itemObj : item))
      : [...tubeHardwareList, itemObj];
    setTubeHardwareList(nextList);
    syncBundleToCloud({ tubeHardwareList: nextList });
    resetTubeForm();
    notifyCms(editingTubeId ? 'Tube ID item updated & synced.' : 'New Tube ID item saved & synced.');
  };

  // Admin: Classic Pathways & Nodes Handlers
  const resetAdminNodeForm = () => {
    setEditingNodeId(null);
    setNewNodeForm({
      title: '',
      subtitle: '',
      checklistText: '',
      criticalNote: '',
      question: '',
      yesLabel: 'Yes',
      yesId: '',
      noLabel: 'No',
      noId: '',
      nextId: ''
    });
  };

  const loadNodeIntoForm = (node) => {
    setEditingNodeId(node.id);
    setNewNodeForm({
      title: node.title || '',
      subtitle: node.subtitle || '',
      checklistText: (node.checklist || []).join('\n'),
      criticalNote: node.criticalNote || '',
      question: node.question || '',
      yesLabel: node.yesLabel || 'Yes',
      yesId: node.yesId || '',
      noLabel: node.noLabel || 'No',
      noId: node.noId || '',
      nextId: node.nextId || ''
    });
  };

  const handleSaveAdminNode = (e) => {
    e.preventDefault();
    if (!adminPathway || !newNodeForm.title.trim()) return;
    const checklist = newNodeForm.checklistText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const nodeObj = {
      id: editingNodeId || `node-${Date.now()}`,
      type: 'action',
      title: newNodeForm.title.trim(),
      subtitle: newNodeForm.subtitle.trim(),
      criticalNote: newNodeForm.criticalNote.trim(),
      checklist,
      question: newNodeForm.question.trim(),
      ...(newNodeForm.yesId && newNodeForm.noId
        ? {
            yesLabel: newNodeForm.yesLabel.trim() || 'Yes',
            yesId: newNodeForm.yesId,
            noLabel: newNodeForm.noLabel.trim() || 'No',
            noId: newNodeForm.noId
          }
        : newNodeForm.nextId
        ? { nextId: newNodeForm.nextId }
        : {})
    };
    const nextPathways = pathways.map((p) => {
      if (p.id !== adminPathway.id) return p;
      const updatedNodes = editingNodeId
        ? p.nodes.map((n) => (n.id === editingNodeId ? { ...n, ...nodeObj } : n))
        : [...p.nodes, nodeObj];
      return { ...p, nodes: updatedNodes };
    });
    setPathways(nextPathways);
    syncBundleToCloud({ pathways: nextPathways });
    resetAdminNodeForm();
    notifyCms(editingNodeId ? 'Pathway step updated & synced.' : 'New pathway step added & synced.');
  };

  const handleDeleteAdminNode = (nodeId) => {
    if (!adminPathway || adminPathway.nodes.length <= 1) return;
    const nextPathways = pathways.map((p) => {
      if (p.id !== adminPathway.id) return p;
      const remaining = p.nodes.filter((n) => n.id !== nodeId);
      return {
        ...p,
        startNodeId: p.startNodeId === nodeId ? remaining[0]?.id : p.startNodeId,
        nodes: remaining
      };
    });
    setPathways(nextPathways);
    syncBundleToCloud({ pathways: nextPathways });
    if (editingNodeId === nodeId) resetAdminNodeForm();
    notifyCms('Pathway step removed.');
  };

  const handleCreateNewPathway = (e) => {
    e.preventDefault();
    if (!newPathwayForm.title.trim()) return;
    const id = `pw-${Date.now()}`;
    const startNodeId = `${id}-start`;
    const created = {
      id,
      title: newPathwayForm.title.trim(),
      subtitle: newPathwayForm.subtitle.trim() || 'Custom clinical pathway',
      category: newPathwayForm.category,
      theme: newPathwayForm.theme,
      badge: newPathwayForm.badge.trim() || 'Clinical Pathway',
      startNodeId,
      references: [],
      nodes: [
        {
          id: startNodeId,
          type: 'governance',
          title: 'Initial Assessment & Safety Check',
          subtitle: 'Verify local Trust guidance and patient Bedhead Sign.',
          criticalNote: '',
          checklist: ['Check Bedhead Sign and spare emergency equipment'],
          question: ''
        }
      ]
    };
    const nextPathways = [...pathways, created];
    setPathways(nextPathways);
    syncBundleToCloud({ pathways: nextPathways });
    setAdminPathwayId(id);
    setShowNewPathwayModal(false);
    setNewPathwayForm({
      title: '',
      subtitle: '',
      category: 'extra',
      theme: 'amber',
      badge: 'Routine & Secondary Care'
    });
    notifyCms('New clinical pathway created & synced.');
  };

  const handleDeletePathway = (pathwayId) => {
    if (pathways.length <= 1) return;
    const nextPathways = pathways.filter((p) => p.id !== pathwayId);
    setPathways(nextPathways);
    syncBundleToCloud({ pathways: nextPathways });
    setAdminPathwayId(nextPathways[0].id);
    if (activePathwayId === pathwayId) setActivePathwayId(null);
    notifyCms('Clinical pathway deleted.');
  };

  const handleAddReferenceToPathway = (e) => {
    e.preventDefault();
    if (!adminPathway || !newRefDraft.title.trim() || !newRefDraft.url.trim()) return;
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
    setPathways(nextPathways);
    syncBundleToCloud({ pathways: nextPathways });
    setNewRefDraft({ title: '', source: '', url: '' });
    notifyCms('Guideline reference link added.');
  };

  const handleDeleteReferenceFromPathway = (refId) => {
    if (!adminPathway) return;
    const nextPathways = pathways.map((p) =>
      p.id === adminPathway.id
        ? { ...p, references: (p.references || []).filter((r) => r.id !== refId) }
        : p
    );
    setPathways(nextPathways);
    syncBundleToCloud({ pathways: nextPathways });
    notifyCms('Guideline link removed.');
  };

  // Persist completed modules locally
  useEffect(() => {
    try {
      localStorage.setItem('pt_completed_mods_v1', JSON.stringify(completedModules));
    } catch {
      // ignore
    }
  }, [completedModules]);

  const markModuleCompleted = (modId) => {
    setCompletedModules((prev) => ({ ...prev, [modId]: true }));
  };

  const openLearningModule = (modId) => {
    setActiveTopTab('learning');
    setLearningSectionTab('modules');
    setActiveModuleId(modId);
    setActiveSectionIndex(0);
    setMaxReachedSectionIndex(0);
    setQuizUnlocked(false);
    setQuizAttemptSeed((s) => s + 1);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setShowFacultyGovernanceBox(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openLockedFeedbackModal = (moduleTitle) => {
    setCourseFeedbackDraft((prev) => ({
      ...prev,
      moduleTitle: moduleTitle || 'All Learning Modules (Overall Curriculum)'
    }));
    setShowCourseFeedbackModal(true);
  };

  // ==========================================
  // CPD CERTIFICATE GENERATOR & POCKET GUIDE
  // ==========================================
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

    const hasReflection = cpdKeyPointsLearned.trim() || cpdPracticeChange.trim();

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
      `PaedTraches.co.uk • Paediatric Tracheostomy Reference (${siteNotices.version}) • Aligned with NTSP & Resuscitation Council UK`,
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
        ${mod.category || mod.badge || 'Clinical Module'}<br/>${siteNotices.version}
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
      PaedTraches.co.uk Clinical Reference Aid — Follow local NHS Trust & JRCALC guidelines. Peer reviewed ${mod.peerReviewedDate || siteNotices.lastReviewed}.
    </div>
    <script>setTimeout(function(){ window.print(); }, 250);</script>
  </body>
</html>`);
    printWin.document.close();
  };

  // Reusable Rich Section Content Renderer (Formatted Text, Tables, Flashcards, Mini-Cases, Photos & Videos)
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
      (sec.miniCaseScenario && (sec.miniCaseOpt0 && sec.miniCaseOpt1)
        ? {
            scenario: sec.miniCaseScenario,
            options: [sec.miniCaseOpt0, sec.miniCaseOpt1, sec.miniCaseOpt2].filter(Boolean),
            correctIndex: Number(sec.miniCaseCorrect || 0),
            feedback: sec.miniCaseFeedback || ''
          }
        : sec.miniCaseScenario && sec.miniCaseFeedback
        ? {
            scenario: sec.miniCaseScenario,
            question: sec.miniCaseQuestion || 'What is the immediate clinical action?',
            answer: sec.miniCaseFeedback
          }
        : null);

    const secKey = sec.id || sec.heading || 'preview';
    const isCardFlipped = !!flippedFlashcards[secKey];
    const selectedCaseOption = miniCaseAnswers[secKey];
    const isCaseAnswerRevealed = !!miniCaseRevealed[secKey];

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
              <span>On-Call Clinical Mini-Case</span>
            </div>
            <p
              className={`font-medium text-slate-800 leading-relaxed ${
                moduleLargeText ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
              }`}
            >
              {miniCaseObj.scenario}
            </p>
            {Array.isArray(miniCaseObj.options) && miniCaseObj.options.length >= 2 ? (
              <>
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
              </>
            ) : (
              <>
                {miniCaseObj.question && (
                  <p className="text-xs sm:text-sm font-bold text-indigo-950">
                    {miniCaseObj.question}
                  </p>
                )}
                {isCaseAnswerRevealed ? (
                  <div className="p-3.5 rounded-xl bg-white border border-indigo-200 text-xs sm:text-sm text-slate-800 leading-relaxed">
                    <strong className="text-emerald-700">Model Clinical Answer:</strong>{' '}
                    {miniCaseObj.answer || miniCaseObj.feedback}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setMiniCaseRevealed((prev) => ({
                        ...prev,
                        [secKey]: true
                      }))
                    }
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
                  >
                    Reveal Clinical Answer
                  </button>
                )}
              </>
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

  // Admin: Rich Learning Modules Handlers
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
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    const attachUploadedImageOffline = () => {
      handlePhotoFileUpload(file, (dataUrl) => {
        setSectionForm((prev) => ({
          ...prev,
          images: [
            ...prev.images,
            {
              id: `img-${Date.now()}`,
              title: newImageDraft.title.trim() || cleanTitle,
              caption: newImageDraft.caption.trim() || '',
              url: dataUrl
            }
          ]
        }));
        setNewImageDraft({ title: '', caption: '', url: '' });
        setUploadingMediaType(null);
        setUploadProgressPct(0);
        notifyCms('Photo compressed offline & attached to section!');
      });
    };

    if (!storage) {
      if (mediaKind === 'image') {
        attachUploadedImageOffline();
        return;
      }
      notifyCms(
        'Firebase Storage is not connected. Paste a YouTube/Vimeo/MP4 URL or enable Firebase Storage.'
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
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgressPct(pct);
      },
      (err) => {
        if (mediaKind === 'image') {
          attachUploadedImageOffline();
          return;
        }
        setUploadingMediaType(null);
        setUploadProgressPct(0);
        notifyCms(
          err?.message ||
            'Video upload failed. Check Firebase Storage rules or paste a YouTube/Vimeo link.'
        );
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

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

  const handleUpdateModuleMeta = (field, value) => {
    if (!adminModule) return;
    const nextModules = learningModules.map((m) =>
      m.id === adminModule.id ? { ...m, [field]: value } : m
    );
    setLearningModules(nextModules);
    syncBundleToCloud({ learningModules: nextModules });
  };

  const handleToggleModuleSettingTag = (tagId) => {
    if (!adminModule) return;
    const current = adminModule.settingTags || [];
    const updated = current.includes(tagId)
      ? current.filter((t) => t !== tagId)
      : [...current, tagId];
    handleUpdateModuleMeta('settingTags', updated.length > 0 ? updated : [tagId]);
  };

  const handleAddModuleObjective = () => {
    if (!adminModule || !newObjectiveDraft.trim()) return;
    const updatedObjectives = [
      ...(adminModule.learningObjectives || []),
      newObjectiveDraft.trim()
    ];
    handleUpdateModuleMeta('learningObjectives', updatedObjectives);
    setNewObjectiveDraft('');
    notifyCms('Added Learning Objective');
  };

  const handleDeleteModuleObjective = (objIndex) => {
    if (!adminModule) return;
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
      settingTags:
        newModuleForm.settingTags.length > 0 ? newModuleForm.settingTags : ['pre-hospital'],
      duration: newModuleForm.duration.trim() || '5 min read',
      targetAudience: 'ENT Trainees, Anaesthetists, Paediatricians, ED Clinicians & Paramedics',
      facultyName: 'Paediatric Airway & Pre-Hospital Education Group',
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
    setLearningModules(nextModules);
    syncBundleToCloud({ learningModules: nextModules });
    setAdminModuleId(newModId);
    setShowNewModuleModal(false);
    setNewModuleForm({
      title: '',
      category: 'Clinical Skills',
      duration: '5 min read',
      summary: '',
      settingTags: ['pre-hospital', 'in-patient']
    });
    resetSectionForm();
    notifyCms(`Created learning module "${createdModule.title}" & synced to Cloud`);
  };

  const handleDeleteModule = (modId) => {
    if (learningModules.length <= 1) return;
    const nextModules = learningModules.filter((m) => m.id !== modId);
    setLearningModules(nextModules);
    syncBundleToCloud({ learningModules: nextModules });
    setAdminModuleId(nextModules[0].id);
    if (activeModuleId === modId) setActiveModuleId(null);
    notifyCms('Learning module removed & synced to Cloud');
  };

  const handleSaveSection = (e) => {
    e.preventDefault();
    if (!adminModule || !sectionForm.heading.trim()) return;

    const hasFlashcard =
      sectionForm.flashcardFront.trim() && sectionForm.flashcardBack.trim();
    const miniCaseOpts = [
      sectionForm.miniCaseOpt0.trim(),
      sectionForm.miniCaseOpt1.trim(),
      sectionForm.miniCaseOpt2.trim()
    ].filter(Boolean);
    const hasChoiceMiniCase =
      sectionForm.miniCaseScenario.trim() && miniCaseOpts.length >= 2;
    const hasRevealMiniCase =
      sectionForm.miniCaseScenario.trim() &&
      miniCaseOpts.length < 2 &&
      sectionForm.miniCaseFeedback.trim();

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
      miniCase: hasChoiceMiniCase
        ? {
            scenario: sectionForm.miniCaseScenario.trim(),
            options: miniCaseOpts,
            correctIndex: Math.min(
              Number(sectionForm.miniCaseCorrect),
              miniCaseOpts.length - 1
            ),
            feedback: sectionForm.miniCaseFeedback.trim()
          }
        : hasRevealMiniCase
        ? {
            scenario: sectionForm.miniCaseScenario.trim(),
            question: 'What is the immediate clinical action?',
            answer: sectionForm.miniCaseFeedback.trim()
          }
        : undefined,
      images: sectionForm.images,
      videos: sectionForm.videos
    };

    const nextModules = learningModules.map((m) => {
      if (m.id !== adminModule.id) return m;
      const exists = (m.sections || []).some((s) => s.id === editingSectionId);
      const updatedSections = exists
        ? m.sections.map((s) => (s.id === editingSectionId ? secObj : s))
        : [...(m.sections || []), secObj];
      return { ...m, sections: updatedSections };
    });

    setLearningModules(nextModules);
    syncBundleToCloud({ learningModules: nextModules });
    notifyCms(`Saved section "${secObj.heading}" & synced to Cloud`);
    resetSectionForm();
  };

  const handleMoveSection = (idx, direction) => {
    if (!adminModule) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= adminModule.sections.length) return;
    const nextModules = learningModules.map((m) => {
      if (m.id !== adminModule.id) return m;
      const copy = [...m.sections];
      const [moved] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, moved);
      return { ...m, sections: copy };
    });
    setLearningModules(nextModules);
    syncBundleToCloud({ learningModules: nextModules });
  };

  const handleDeleteSection = (secId) => {
    if (!adminModule || (adminModule.sections || []).length <= 1) return;
    const nextModules = learningModules.map((m) => {
      if (m.id !== adminModule.id) return m;
      return { ...m, sections: m.sections.filter((s) => s.id !== secId) };
    });
    setLearningModules(nextModules);
    syncBundleToCloud({ learningModules: nextModules });
    if (editingSectionId === secId) resetSectionForm();
    notifyCms('Section removed.');
  };

  const handleAddQuizQuestion = (e) => {
    e.preventDefault();
    if (!adminModule || !newQuizDraft.q.trim() || !newQuizDraft.opt0.trim() || !newQuizDraft.opt1.trim()) {
      return;
    }
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
      m.id === adminModule.id ? { ...m, quiz: [...(m.quiz || []), newQ] } : m
    );
    setLearningModules(nextModules);
    syncBundleToCloud({ learningModules: nextModules });

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
    if (!adminModule) return;
    const nextModules = learningModules.map((m) =>
      m.id === adminModule.id
        ? { ...m, quiz: (m.quiz || []).filter((_, i) => i !== qIndex) }
        : m
    );
    setLearningModules(nextModules);
    syncBundleToCloud({ learningModules: nextModules });
  };

  // Admin: Procedure Sim Designer Handlers
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
    notifyCms('New Procedure Sim created & synced.');
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
    notifyCms('Step added to Procedure Sim & synced.');
  };

  // Admin: Team Management, Profile/Password & Site Notices Handlers
  const activeAdminProfile = useMemo(() => {
    if (currentAdminUser) return currentAdminUser;
    const matchByInput = adminUsers.find(
      (u) => u.email.toLowerCase() === adminEmailInput.trim().toLowerCase()
    );
    return (
      matchByInput ||
      adminUsers[0] || {
        id: 'adm-lead-1',
        name: 'Clinical Airway Lead',
        email: adminEmailInput.trim() || 'ent.lead@nhs.net',
        role: 'Clinical Lead (Super Admin)',
        addedAt: new Date().toISOString().slice(0, 10)
      }
    );
  }, [currentAdminUser, adminUsers, adminEmailInput]);

  useEffect(() => {
    if (isAdminSignedIn && activeAdminProfile) {
      setOwnProfileForm((prev) => ({
        name: prev.email === activeAdminProfile.email && prev.name ? prev.name : activeAdminProfile.name,
        email: activeAdminProfile.email,
        newPassword: prev.newPassword
      }));
    }
  }, [isAdminSignedIn, activeAdminProfile]);

  const appendAuditEntry = (actionText, extraOverrides = {}) => {
    const entry = {
      id: `aud-${Date.now()}`,
      actor: activeAdminProfile?.name || 'Admin',
      action: actionText,
      timestamp: new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    const nextLogs = [entry, ...auditLogs].slice(0, 40);
    setAuditLogs(nextLogs);
    syncBundleToCloud({ ...extraOverrides, auditLogs: nextLogs });
    return nextLogs;
  };

  const handleUpdateOwnProfile = async (e) => {
    e.preventDefault();
    if (!ownProfileForm.name.trim()) {
      notifyCms('Please enter your display name.');
      return;
    }

    try {
      const wantsPasswordChange = ownProfileForm.newPassword.trim().length > 0;
      if (wantsPasswordChange) {
        if (ownProfileForm.newPassword.trim().length < 6) {
          notifyCms('Firebase requires new passwords to be at least 6 characters long.');
          return;
        }
        if (auth && auth.currentUser && !auth.currentUser.isAnonymous) {
          await updatePassword(auth.currentUser, ownProfileForm.newPassword.trim());
        } else {
          notifyCms(
            'Display name saved locally. To change your Firebase Auth password, sign in with your Firebase email & password first.'
          );
        }
      }

      const targetEmail = (activeAdminProfile?.email || ownProfileForm.email).toLowerCase();
      const updatedSelf = {
        ...activeAdminProfile,
        name: ownProfileForm.name.trim(),
        email: targetEmail
      };

      const existsInRoster = adminUsers.some((u) => u.email.toLowerCase() === targetEmail);
      const nextAdmins = existsInRoster
        ? adminUsers.map((u) => (u.email.toLowerCase() === targetEmail ? updatedSelf : u))
        : [...adminUsers, updatedSelf];

      setAdminUsers(nextAdmins);
      setCurrentAdminUser(updatedSelf);
      setOwnProfileForm((prev) => ({ ...prev, newPassword: '' }));
      appendAuditEntry(
        `Updated admin profile${wantsPasswordChange ? ' & password' : ''} (${updatedSelf.name})`,
        { adminUsers: nextAdmins }
      );
      if (wantsPasswordChange && auth?.currentUser && !auth.currentUser.isAnonymous) {
        notifyCms('Your profile and encrypted Firebase password have been updated!');
      } else if (!wantsPasswordChange) {
        notifyCms('Your admin profile name has been updated & synced!');
      }
    } catch (err) {
      if (err?.code === 'auth/requires-recent-login') {
        notifyCms(
          'For security, Firebase requires a fresh sign-in before changing your password. Sign out, sign back in, or use "Send Password Reset Email".'
        );
      } else {
        notifyCms(err?.message || 'Could not update profile/password.');
      }
    }
  };

  const handleSendPasswordReset = async () => {
    const targetEmail = (ownProfileForm.email || activeAdminProfile?.email || '').trim().toLowerCase();
    if (!targetEmail || !auth) {
      notifyCms('Firebase Authentication is not connected.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      notifyCms(`Password reset link sent to ${targetEmail}! Check your inbox.`);
    } catch (err) {
      notifyCms(err?.message || 'Could not send password reset email.');
    }
  };

  const handleAddAdminTeamMember = async (e) => {
    e.preventDefault();
    const cleanEmail = newAdminForm.email.trim().toLowerCase();
    if (!newAdminForm.name.trim() || !cleanEmail || newAdminForm.password.trim().length < 6) {
      notifyCms('Please provide name, email, and a password of at least 6 characters.');
      return;
    }
    if (adminUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
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
      setAdminUsers(nextAdmins);
      appendAuditEntry(
        `Added team member ${createdUser.name} (${createdUser.role})`,
        { adminUsers: nextAdmins }
      );
      setNewAdminForm({
        name: '',
        email: '',
        role: 'Content Editor',
        password: ''
      });
      notifyCms(
        `Created encrypted login & team profile for ${createdUser.name}! They can sign in immediately.`
      );
    } catch (err) {
      if (err?.code === 'auth/email-already-in-use') {
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
        setAdminUsers(nextAdmins);
        appendAuditEntry(
          `Linked existing Firebase account ${createdUser.name} (${createdUser.role}) to team roster`,
          { adminUsers: nextAdmins }
        );
        setNewAdminForm({
          name: '',
          email: '',
          role: 'Content Editor',
          password: ''
        });
        notifyCms(`Added ${createdUser.name} to team roster (existing Firebase Auth account linked).`);
      } else {
        notifyCms(err?.message || 'Could not create team member account.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdateAdminRole = (targetId, newRole) => {
    const nextAdmins = adminUsers.map((u) => (u.id === targetId ? { ...u, role: newRole } : u));
    setAdminUsers(nextAdmins);
    const target = adminUsers.find((u) => u.id === targetId);
    appendAuditEntry(`Changed role for ${target?.name || targetId} to ${newRole}`, {
      adminUsers: nextAdmins
    });
    notifyCms(`Updated role for ${target?.name || 'team member'}.`);
  };

  const handleRemoveAdminUser = async (targetId) => {
    if (adminUsers.length <= 1) {
      notifyCms('Cannot remove the last remaining administrator.');
      return;
    }
    const target = adminUsers.find((u) => u.id === targetId);
    if (target && db) {
      await deleteDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'admin_team', target.email.toLowerCase())
      ).catch(() => {});
    }
    const nextAdmins = adminUsers.filter((u) => u.id !== targetId);
    setAdminUsers(nextAdmins);
    appendAuditEntry(`Removed admin team member ${target?.name || targetId}`, {
      adminUsers: nextAdmins
    });
    notifyCms(`Removed ${target?.name || 'user'} from the admin team.`);
  };

  const handleSaveSiteNotices = (e) => {
    e.preventDefault();
    const cleaned = {
      ...INITIAL_SITE_NOTICES,
      ...noticesDraft,
      version: noticesDraft.version.trim() || INITIAL_SITE_NOTICES.version,
      clinicalLead: noticesDraft.clinicalLead.trim() || INITIAL_SITE_NOTICES.clinicalLead,
      lastReviewed: noticesDraft.lastReviewed.trim() || INITIAL_SITE_NOTICES.lastReviewed,
      nextReviewDue: noticesDraft.nextReviewDue.trim() || INITIAL_SITE_NOTICES.nextReviewDue,
      footerNotice: noticesDraft.footerNotice.trim() || INITIAL_SITE_NOTICES.footerNotice
    };
    setSiteNotices(cleaned);
    appendAuditEntry('Updated website footer & governance/legal notices', {
      siteNotices: cleaned
    });
    notifyCms('Bottom website notices & governance text published & synced to Cloud!');
  };

  const handleResetSiteNotices = () => {
    setSiteNotices(INITIAL_SITE_NOTICES);
    setNoticesDraft(INITIAL_SITE_NOTICES);
    appendAuditEntry('Reset website footer & legal notices to default wording', {
      siteNotices: INITIAL_SITE_NOTICES
    });
    notifyCms('Restored default UK governance & footer notices.');
  };

  const handleAdminSignOut = async () => {
    setIsAdminSignedIn(false);
    setCurrentAdminUser(null);
    if (auth) {
      try {
        await signOut(auth);
        await signInAnonymously(auth);
      } catch {
        // ignore
      }
    }
  };

  const hasAnySearchResults =
    searchResults.pathways.length > 0 ||
    searchResults.steps.length > 0 ||
    searchResults.modules.length > 0 ||
    searchResults.hardware.length > 0 ||
    searchResults.troubleshoot.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 flex flex-col">
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
              setActivePathwayId(null);
              setOnCallSubView('main');
            }}
            className="flex items-center gap-2.5 text-left shrink-0 group"
          >
            <PaedTrachesLogo className="w-9 h-9" />
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

          {/* Search & Full-Screen Admin Toggle */}
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
                                setActiveToolModal('hardware');
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
                                setActiveToolModal('troubleshoot');
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
                                handleOpenPathway(p.id);
                                setShowSearchDropdown(false);
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-indigo-50 transition"
                            >
                              <div className="text-xs font-bold text-slate-900">{p.title}</div>
                              <div className="text-[11px] text-slate-500 truncate">{p.subtitle}</div>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.steps.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 px-2">
                            Pathway Steps
                          </div>
                          {searchResults.steps.map((st) => (
                            <button
                              key={`${st.pathwayId}-${st.nodeId}`}
                              type="button"
                              onClick={() => {
                                handleOpenPathway(st.pathwayId, st.nodeId);
                                setShowSearchDropdown(false);
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-sky-50 transition"
                            >
                              <div className="text-xs font-bold text-slate-900">
                                {cleanStepTitle(st.node.title)}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {st.pathwayTitle}
                              </div>
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
                                openLearningModule(m.id);
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
              onClick={() =>
                setActiveTopTab((prev) => (prev === 'admin' ? 'pathways' : 'admin'))
              }
              className={`p-2 rounded-xl transition border ${
                activeTopTab === 'admin'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent'
              }`}
              title="Full-Screen Admin Content Manager"
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
                  setActiveToolModal('hardware');
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
                  setActiveToolModal('troubleshoot');
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
                  handleOpenPathway(p.id);
                  setGlobalSearchQuery('');
                }}
                className="w-full text-left p-2 rounded-lg bg-white border border-slate-100 text-xs"
              >
                <span className="text-[10px] font-bold text-indigo-700 mr-1.5">PATHWAY</span>
                <span className="font-semibold text-slate-900">{p.title}</span>
              </button>
            ))}
            {searchResults.modules.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  openLearningModule(m.id);
                  setGlobalSearchQuery('');
                }}
                className="w-full text-left p-2 rounded-lg bg-white border border-slate-100 text-xs"
              >
                <span className="text-[10px] font-bold text-amber-700 mr-1.5">MODULE</span>
                <span className="font-semibold text-slate-900">{m.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ==========================================
          MAIN CONTENT AREA
         ========================================== */}
      <main className="max-w-6xl mx-auto w-full flex-1 px-4 sm:px-6 py-6 sm:py-8">
        {/* ========================================== 1A. CLASSIC ON-CALL HOME VIEW ========================================== */}
        {activeTopTab === 'pathways' && !activePathwayId && onCallSubView === 'main' && (
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
                  onClick={() => setActiveToolModal('calculator')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition"
                >
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>Tube Sizer</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHighlightedTubeId(null);
                    setActiveToolModal('hardware');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold transition"
                >
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span>Tube ID</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveToolModal('troubleshoot')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold transition"
                >
                  <Wrench className="w-4 h-4 text-rose-600" />
                  <span>Airway Troubleshooting</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveToolModal('checklist')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold transition"
                >
                  <ClipboardCheck className="w-4 h-4 text-sky-600" />
                  <span>Go-Bag Check</span>
                </button>
                <button
                  type="button"
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
                      type="button"
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
                    type="button"
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
                    type="button"
                    onClick={() => {
                      setHighlightedTubeId(null);
                      setActiveToolModal('hardware');
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
                    type="button"
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
                    type="button"
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

        {/* ========================================== 1B. EXTRA PATHWAYS & ROUTINE CARE SUB-PAGE ========================================== */}
        {activeTopTab === 'pathways' && !activePathwayId && onCallSubView === 'extra' && (
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
                Secondary clinical pathways for routine suctioning, humidification, and post-decannulation transport.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {extraRoutinePathways.map((pathway) => {
                const style = getThemeStyles(pathway.theme);
                return (
                  <button
                    key={pathway.id}
                    type="button"
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

        {/* ========================================== 1C. CLASSIC ACTIVE PATHWAY VIEW ========================================== */}
        {activeTopTab === 'pathways' && activePathwayId && activePathway && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setActivePathwayId(null)}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 py-1.5 px-3 rounded-xl hover:bg-slate-200/60 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Pathways</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
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
                  type="button"
                  onClick={() => setActiveToolModal('calculator')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
                >
                  <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sizer</span>
                </button>
                <div className="inline-flex bg-slate-200/70 p-1 rounded-xl">
                  <button
                    type="button"
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
                    type="button"
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
                    type="button"
                    onClick={() => setTimerRunning((prev) => !prev)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{timerRunning ? 'Pause' : 'Start'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerSeconds(0);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                    title="Reset CPR Timer"
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
                    type="button"
                    onClick={handleStepBack}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
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
                              type="button"
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
                          type="button"
                          onClick={() => handleSelectDecision(currentNode.yesId)}
                          className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm sm:text-base shadow-sm transition flex items-center justify-between"
                        >
                          <span>{currentNode.yesLabel || 'Yes'}</span>
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
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
                        type="button"
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
                            type="button"
                            onClick={() => setActiveToolModal('handover')}
                            className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                          >
                            Build A&amp;E Pre-Alert
                          </button>
                          <button
                            type="button"
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
                            type="button"
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
                          type="button"
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
                        type="button"
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
                  type="button"
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

            {/* 2A. RICH LEARNING MODULES WITH SETTING FILTERS, OBJECTIVES, TABLES, MEDIA, MINI-CASES & CPD */}
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

                  {/* Reading Progress Bar */}
                  <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{
                        width: `${
                          quizUnlocked
                            ? 100
                            : ((activeSectionIndex + 1) / Math.max(1, activeModule.sections.length)) * 100
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
                      {activeModule.category || activeModule.badge}
                    </span>
                    <h1
                      className={`text-2xl sm:text-3xl font-bold ${
                        moduleNightMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {activeModule.title}
                    </h1>
                  </div>

                  {/* Module Learning Objectives Card */}
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
                    {/* Left Desktop Sections Sidebar (Sequential Unlock + Knowledge Check & CPD) */}
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
                              type="button"
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
                            type="button"
                            disabled={
                              !quizUnlocked &&
                              maxReachedSectionIndex < activeModule.sections.length - 1
                            }
                            onClick={() => {
                              setQuizUnlocked(true);
                              setQuizAttemptSeed((s) => s + 1);
                              setQuizAnswers({});
                              setQuizSubmitted(false);
                              if ((activeModule.quiz || []).length === 0) {
                                markModuleCompleted(activeModule.id);
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

                    {/* Right Rich Section Content / Shuffled Knowledge Check & CPD Certificate */}
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
                                type="button"
                                onClick={() => {
                                  setQuizUnlocked(true);
                                  setQuizAttemptSeed((s) => s + 1);
                                  setQuizAnswers({});
                                  setQuizSubmitted(false);
                                  if ((activeModule.quiz || []).length === 0) {
                                    markModuleCompleted(activeModule.id);
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
                              type="button"
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
                                  type="button"
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
                                          type="button"
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
                                              markModuleCompleted(activeModule.id);
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
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
                        Learning Modules
                      </h1>
                      <p className="text-sm sm:text-base text-slate-500">
                        Filter modules by clinical setting — complete learning objectives, comparison tables, videos, mini-cases, and 100% quiz for your CPD certificate.
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
                          onClick={() => openLearningModule(mod.id)}
                          className="w-full text-left bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between gap-5 group"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                {mod.category || mod.badge}
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

                // Multi-Layer Anatomical Depth Stage
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

                // Mid-Procedure "What If?" Complication Scenarios
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

                            {/* Mid-Procedure Complication Popup */}
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

                                        {/* Layer 3: Open Tracheal Lumen Window */}
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

                                    {/* Saline Syringe Aspiration Bubbles on Needle CTM */}
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

        {/* ==========================================
            3. FULL-SCREEN ADMIN CONTENT MANAGER
           ========================================== */}
        {activeTopTab === 'admin' && !isAdminSignedIn && (
          <div className="max-w-md mx-auto my-8">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Clinical Admin Sign In
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Sign in with Firebase Admin email &amp; password (or leave password blank for local preview).
                  </p>
                </div>
              </div>

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
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Clinical Lead Email
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmailInput}
                    onChange={(e) => {
                      setAdminEmailInput(e.target.value);
                      setAdminAuthError('');
                    }}
                    placeholder="name@nhs.net"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Firebase Password
                  </label>
                  <input
                    type="password"
                    value={adminPassInput}
                    onChange={(e) => {
                      setAdminPassInput(e.target.value);
                      setAdminAuthError('');
                    }}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                  {adminAuthError && (
                    <p className="text-xs font-semibold text-rose-600 mt-1.5">{adminAuthError}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTopTab('pathways')}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-2xs"
                  >
                    Open Content Manager
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTopTab === 'admin' && isAdminSignedIn && (
          <div className="space-y-6">
            {/* Full-Screen Admin Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Admin Content Manager
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      cloudStatus === 'synced'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Cloud className="w-3 h-3" />
                    <span>{cloudStatus === 'synced' ? 'Live Cloud Sync' : 'Offline Local Cache'}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Full-screen editor for Pathways, Learning Modules, Offline Tube ID Photos, Procedure Sims, Feedback &amp; Excel, Resources, Bottom Site Notices &amp; Admin Team.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{activeAdminProfile.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTopTab('pathways')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Guide</span>
                </button>
                <button
                  type="button"
                  onClick={handleAdminSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Admin Tabs Bar */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap gap-1.5">
              {[
                { id: 'pathways', label: `Pathways (${pathways.length})` },
                { id: 'modules', label: `Modules (${learningModules.length})` },
                { id: 'tube-id', label: `Tube ID (${tubeHardwareList.length})` },
                { id: 'sims', label: `Procedure Sims (${procedureSims.length})` },
                {
                  id: 'feedback',
                  label: `Feedback & Excel (${courseFeedbackLogs.length + websiteFeedbackLogs.length})`
                },
                { id: 'resources', label: `Resources (${externalResources.length})` },
                { id: 'notices', label: 'Site Notices' },
                { id: 'team', label: `Team & Account (${adminUsers.length})` }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAdminTab(t.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    adminTab === t.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {cmsNotification && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between">
                <span>✓ {cmsNotification}</span>
                <button type="button" onClick={() => setCmsNotification(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ADMIN TAB 1: CLASSIC PATHWAYS & NODES EDITOR */}
            {adminTab === 'pathways' && adminPathway && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {pathways.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setAdminPathwayId(p.id);
                          resetAdminNodeForm();
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                          adminPathway.id === p.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{p.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            adminPathway.id === p.id
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
                    type="button"
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
                    <p className="text-xs text-slate-500 mt-0.5">{adminPathway.subtitle}</p>
                  </div>

                  {pathways.length > 1 && (
                    <button
                      type="button"
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
                        type="button"
                        onClick={resetAdminNodeForm}
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
                            <div className="space-y-1 min-w-0">
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
                                type="button"
                                onClick={() => loadNodeIntoForm(node)}
                                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
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
                      {editingNodeId ? 'Edit Pathway Step' : 'Add a New Step'}
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
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900"
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
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900"
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
                        placeholder={'Remove speaking valve or cap\nLook, listen, and feel at mouth and tracheostomy\nPass flexible suction catheter'}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900"
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
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="text-xs font-bold text-slate-800">
                        Decision Question &amp; Branching Links
                      </div>
                      <input
                        type="text"
                        value={newNodeForm.question}
                        onChange={(e) =>
                          setNewNodeForm({ ...newNodeForm, question: e.target.value })
                        }
                        placeholder="Question at bottom of card (e.g., Does the suction catheter pass easily?)"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm text-slate-900"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-emerald-700">
                            If &ldquo;Yes&rdquo; → Go to Step:
                          </label>
                          <input
                            type="text"
                            value={newNodeForm.yesLabel}
                            onChange={(e) =>
                              setNewNodeForm({ ...newNodeForm, yesLabel: e.target.value })
                            }
                            placeholder="Yes Button Label"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                          />
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

                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-rose-700">
                            If &ldquo;No&rdquo; → Go to Step:
                          </label>
                          <input
                            type="text"
                            value={newNodeForm.noLabel}
                            onChange={(e) =>
                              setNewNodeForm({ ...newNodeForm, noLabel: e.target.value })
                            }
                            placeholder="No Button Label"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                          />
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
                          Or Single &ldquo;Continue&rdquo; Step (if not a Yes/No question):
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
                          onClick={resetAdminNodeForm}
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

                {/* Bottom Guideline & NICE Reference Links Editor */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>
                        Bottom Guideline &amp; NICE Reference Links for &ldquo;{adminPathway.title}&rdquo; (
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
                      onChange={(e) => setNewRefDraft({ ...newRefDraft, title: e.target.value })}
                      placeholder="Guideline Title (e.g., NICE NG143 Paediatric Airway)"
                      className="sm:col-span-4 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                    <input
                      type="text"
                      value={newRefDraft.source}
                      onChange={(e) => setNewRefDraft({ ...newRefDraft, source: e.target.value })}
                      placeholder="Organisation (e.g., NICE / NTSP)"
                      className="sm:col-span-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    />
                    <input
                      type="url"
                      required
                      value={newRefDraft.url}
                      onChange={(e) => setNewRefDraft({ ...newRefDraft, url: e.target.value })}
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

            {/* ADMIN TAB 2: RICH LEARNING MODULES EDITOR (OBJECTIVES, TABLES, MEDIA, FLASHCARDS, MINI-CASES, QUIZ & SETTING FILTERS) */}
            {adminTab === 'modules' && adminModule && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {learningModules.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setAdminModuleId(m.id);
                          resetSectionForm();
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                          adminModule.id === m.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {m.title}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
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
                      Module Overview, Setting Filters, Faculty Attribution &amp; Learning Objectives
                    </h2>
                    {learningModules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteModule(adminModule.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Module</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
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
                        value={adminModule.category || adminModule.badge || ''}
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

                  {/* Clinical Setting Filter Tags */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Clinical Setting Filter Tags (Shown in Learning Modules Filter)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {MODULE_SETTING_FILTERS.filter((f) => f.id !== 'all').map((flt) => {
                        const active = (adminModule.settingTags || []).includes(flt.id);
                        return (
                          <button
                            key={flt.id}
                            type="button"
                            onClick={() => handleToggleModuleSettingTag(flt.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                              active
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {active ? '✓ ' : '+ '}
                            {flt.label}
                          </button>
                        );
                      })}
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

                {/* Sections List + Rich Section Editor */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-4 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3 self-start">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-900">
                        Sections ({(adminModule.sections || []).length})
                      </h3>
                      <button
                        type="button"
                        onClick={resetSectionForm}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Section</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(adminModule.sections || []).map((sec, idx) => (
                        <div
                          key={sec.id || idx}
                          className={`p-3 rounded-xl border transition flex items-start justify-between gap-2 ${
                            editingSectionId === sec.id
                              ? 'bg-emerald-50/50 border-emerald-400'
                              : 'bg-slate-50/60 border-slate-200/80'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
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
                              {sec.miniCase && (
                                <>
                                  <span>•</span>
                                  <span>mini-case</span>
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
                              disabled={idx === (adminModule.sections || []).length - 1}
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

                        {/* Quick-Reference Comparison Table Builder */}
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

                        {/* Callout Banner */}
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

                        {/* Active Recall Flip-Flashcard */}
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

                        {/* On-Call Clinical Mini-Case Scenario (Lives Inside Module Section — Not Quiz) */}
                        <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/80 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                              <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                              <span>On-Call Clinical Mini-Case (Shown Inside This Learning Section)</span>
                            </div>
                            <span className="text-[10px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                              Leave Choices blank for Reveal-Answer style
                            </span>
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

                        {/* Photos & Diagrams Uploader */}
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

                        {/* Training Videos Uploader (MP4/MOV + YouTube/Vimeo + Transcript) */}
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

                {/* End-of-Module Knowledge Quiz Editor */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        End-of-Module Knowledge Quiz ({(adminModule.quiz || []).length} questions)
                      </h3>
                    </div>
                  </div>

                  {(adminModule.quiz || []).length > 0 && (
                    <div className="space-y-2">
                      {adminModule.quiz.map((qItem, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="text-xs sm:text-sm font-semibold text-slate-900">
                              {idx + 1}. {qItem.q || qItem.question}
                            </div>
                            <div className="text-xs text-emerald-700 font-medium">
                              Correct answer:{' '}
                              {qItem.options[qItem.correct ?? qItem.correctIndex ?? 0]}
                            </div>
                          </div>
                          <button
                            type="button"
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

            {/* ADMIN TAB 3: CLASSIC TUBE ID & OFFLINE PHOTO UPLOADER */}
            {adminTab === 'tube-id' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleSaveTubeItem}
                  className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-200 space-y-3 self-start"
                >
                  <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2.5">
                    {editingTubeId ? 'Edit Tube / Hardware Item' : 'Add New Tube / Valve'}
                  </h3>
                  <input
                    type="text"
                    required
                    placeholder="Tube / Valve Name (e.g. Bivona TTS Cuffed)"
                    value={tubeForm.name}
                    onChange={(e) => setTubeForm({ ...tubeForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Highlight Badge (e.g. Sterile-Water Cuff)"
                      value={tubeForm.tag}
                      onChange={(e) => setTubeForm({ ...tubeForm, tag: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                    />
                    <select
                      value={tubeForm.tagColor}
                      onChange={(e) => setTubeForm({ ...tubeForm, tagColor: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-semibold"
                    >
                      {TUBE_TAG_COLOR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Cuff / Valve Type (e.g. Silicone cuff — STERILE WATER)"
                    value={tubeForm.cuffType}
                    onChange={(e) => setTubeForm({ ...tubeForm, cuffType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                  />
                  <input
                    type="text"
                    placeholder="Inner Cannula Notes"
                    value={tubeForm.innerCannula}
                    onChange={(e) => setTubeForm({ ...tubeForm, innerCannula: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                  />
                  <textarea
                    rows={2}
                    placeholder="Visual Cue"
                    value={tubeForm.keyVisualCue}
                    onChange={(e) => setTubeForm({ ...tubeForm, keyVisualCue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                  />
                  <textarea
                    rows={2}
                    placeholder="Emergency Roadside Action"
                    value={tubeForm.emergencyAction}
                    onChange={(e) => setTubeForm({ ...tubeForm, emergencyAction: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                  />

                  {/* Offline-Ready Photo Upload (No Wi-Fi / No External URL Needed) */}
                  <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-bold text-slate-700">
                        Offline Reference Photo Upload
                      </div>
                      {tubeForm.imageUrl && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          ✓ Stored Offline (No Wi-Fi needed)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Uploaded photos are compressed and embedded directly inside the app &amp; cloud bundle so they always load offline on shift.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {tubeForm.imageUrl ? 'Replace Uploaded Photo' : 'Upload Photo from Device'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handlePhotoFileUpload(e.target.files[0], (dataUrl) =>
                                setTubeForm((prev) => ({ ...prev, imageUrl: dataUrl }))
                              );
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      {tubeForm.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setTubeForm({ ...tubeForm, imageUrl: '' })}
                          className="text-xs text-rose-600 font-semibold"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                    {tubeForm.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 max-w-[200px] bg-white">
                        <img
                          src={tubeForm.imageUrl}
                          alt="Preview"
                          className="w-full h-auto block"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      {editingTubeId ? 'Save Changes & Sync' : 'Add to Tube ID'}
                    </button>
                    {editingTubeId && (
                      <button
                        type="button"
                        onClick={resetTubeForm}
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
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {item.tag} • {item.cuffType}
                          </div>
                          <div className="text-[10px] font-semibold text-emerald-700">
                            {item.imageUrl ? '✓ Offline photo attached' : 'No photo uploaded yet'}
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
                              tag: item.tag || '',
                              tagColor:
                                item.tagColor ||
                                'bg-emerald-50 text-emerald-700 border-emerald-200',
                              cuffType: item.cuffType || '',
                              innerCannula: item.innerCannula || '',
                              keyVisualCue: item.keyVisualCue || '',
                              emergencyAction: item.emergencyAction || '',
                              imageUrl: item.imageUrl || ''
                            });
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {tubeHardwareList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextList = tubeHardwareList.filter((x) => x.id !== item.id);
                              setTubeHardwareList(nextList);
                              syncBundleToCloud({ tubeHardwareList: nextList });
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADMIN TAB 4: PROCEDURE SIM DESIGNER */}
            {adminTab === 'sims' && (
              <div className="space-y-5">
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
                    <div className="lg:col-span-6 bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
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
                                const nextSims = procedureSims.map((s) =>
                                  s.id === adminSelectedSim.id
                                    ? {
                                        ...s,
                                        diagramType: 'custom-image',
                                        customDiagramUrl: dataUrl
                                      }
                                    : s
                                );
                                setProcedureSims(nextSims);
                                syncBundleToCloud({ procedureSims: nextSims });
                                notifyCms('Custom diagram uploaded & synced.');
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
                                onClick={() => {
                                  const nextSims = procedureSims.map((s) =>
                                    s.id === adminSelectedSim.id
                                      ? { ...s, steps: s.steps.filter((x) => x.id !== st.id) }
                                      : s
                                  );
                                  setProcedureSims(nextSims);
                                  syncBundleToCloud({ procedureSims: nextSims });
                                }}
                                className="text-rose-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <form
                      onSubmit={handleAddStepToAdminSim}
                      className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-200 space-y-3 self-start"
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
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                        />
                        <select
                          value={stepForm.ageFilter}
                          onChange={(e) => setStepForm({ ...stepForm, ageFilter: e.target.value })}
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
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
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                      />
                      <textarea
                        rows={2}
                        placeholder="Step Instruction"
                        value={stepForm.instruction}
                        onChange={(e) => setStepForm({ ...stepForm, instruction: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                      />
                      <textarea
                        rows={2}
                        placeholder="ENT / Surgical Pearl"
                        value={stepForm.traineeTip}
                        onChange={(e) => setStepForm({ ...stepForm, traineeTip: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={stepForm.requiredTool}
                          onChange={(e) =>
                            setStepForm({ ...stepForm, requiredTool: e.target.value })
                          }
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
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
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
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

            {/* ADMIN TAB 5: FEEDBACK & BRANDED EXCEL EXPORT */}
            {adminTab === 'feedback' && (
              <div className="space-y-4 bg-white rounded-2xl p-5 border border-slate-200">
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
                        onClick={() => downloadPaedTrachesCourseFeedbackExcel(courseFeedbackLogs)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Excel (.xls)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => downloadPaedTrachesWebsiteFeedbackExcel(websiteFeedbackLogs)}
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
                              onClick={() => {
                                const next = courseFeedbackLogs.filter((x) => x.id !== fb.id);
                                setCourseFeedbackLogs(next);
                                syncBundleToCloud({ courseFeedbackLogs: next });
                              }}
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
                            onClick={() => {
                              const next = websiteFeedbackLogs.filter((x) => x.id !== wf.id);
                              setWebsiteFeedbackLogs(next);
                              syncBundleToCloud({ websiteFeedbackLogs: next });
                            }}
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

            {/* ADMIN TAB 6: RECOMMENDED EXTERNAL RESOURCES MANAGER */}
            {adminTab === 'resources' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <form
                  onSubmit={handleAddExternalResource}
                  className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 space-y-3 self-start"
                >
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Add Recommended External Link
                  </h3>
                  <input
                    type="text"
                    required
                    placeholder="Resource Title *"
                    value={resourceForm.title}
                    onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Organisation (e.g. NTSP)"
                      value={resourceForm.organisation}
                      onChange={(e) =>
                        setResourceForm({ ...resourceForm, organisation: e.target.value })
                      }
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Category"
                      value={resourceForm.category}
                      onChange={(e) =>
                        setResourceForm({ ...resourceForm, category: e.target.value })
                      }
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    />
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={resourceForm.url}
                    onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  />
                  <textarea
                    rows={2}
                    placeholder="Brief description of why we recommend this resource..."
                    value={resourceForm.description}
                    onChange={(e) =>
                      setResourceForm({ ...resourceForm, description: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
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
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-start justify-between gap-3 text-xs"
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
                        onClick={() => {
                          const next = externalResources.filter((x) => x.id !== res.id);
                          setExternalResources(next);
                          syncBundleToCloud({ externalResources: next });
                        }}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADMIN TAB 7: BOTTOM SITE NOTICES, FOOTER & LEGAL GOVERNANCE EDITOR */}
            {adminTab === 'notices' && (
              <form
                onSubmit={handleSaveSiteNotices}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Scale className="w-4 h-4 text-emerald-600" />
                        <span>Bottom Website Notices, Footer &amp; Legal Governance Content</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Edit the footer copyright strip and all 4 legal notice tabs shown at the bottom of the website (supports **bold** and &quot;- &quot; bullet points).
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLegalModalTab('disclaimer');
                          setShowGovernanceModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Modal</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetSiteNotices}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Defaults</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Document / Edition Version
                      </label>
                      <input
                        type="text"
                        value={noticesDraft.version}
                        onChange={(e) =>
                          setNoticesDraft({ ...noticesDraft, version: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Clinical Governance Lead
                      </label>
                      <input
                        type="text"
                        value={noticesDraft.clinicalLead}
                        onChange={(e) =>
                          setNoticesDraft({ ...noticesDraft, clinicalLead: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Last Clinical Review Date
                      </label>
                      <input
                        type="text"
                        value={noticesDraft.lastReviewed}
                        onChange={(e) =>
                          setNoticesDraft({ ...noticesDraft, lastReviewed: e.target.value })
                        }
                        placeholder="YYYY-MM-DD"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Next Review Due Date
                      </label>
                      <input
                        type="text"
                        value={noticesDraft.nextReviewDue}
                        onChange={(e) =>
                          setNoticesDraft({ ...noticesDraft, nextReviewDue: e.target.value })
                        }
                        placeholder="YYYY-MM-DD"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Footer Copyright &amp; Attribution Line (Always visible at bottom of every page)
                    </label>
                    <textarea
                      rows={2}
                      value={noticesDraft.footerNotice}
                      onChange={(e) =>
                        setNoticesDraft({ ...noticesDraft, footerNotice: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2.5">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      1. Governance / Clinical Disclaimer Notice
                    </label>
                    <textarea
                      rows={8}
                      value={noticesDraft.disclaimerText}
                      onChange={(e) =>
                        setNoticesDraft({ ...noticesDraft, disclaimerText: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 leading-relaxed"
                    />
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2.5">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                      2. Copyright &amp; IP Notice
                    </label>
                    <input
                      type="text"
                      value={noticesDraft.copyrightBanner}
                      onChange={(e) =>
                        setNoticesDraft({ ...noticesDraft, copyrightBanner: e.target.value })
                      }
                      placeholder="Highlight banner heading..."
                      className="w-full px-3 py-1.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs font-semibold text-emerald-950"
                    />
                    <textarea
                      rows={7}
                      value={noticesDraft.copyrightText}
                      onChange={(e) =>
                        setNoticesDraft({ ...noticesDraft, copyrightText: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 leading-relaxed"
                    />
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2.5">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-800">
                      3. UK MHRA / SaMD Notice
                    </label>
                    <input
                      type="text"
                      value={noticesDraft.mhraBanner}
                      onChange={(e) =>
                        setNoticesDraft({ ...noticesDraft, mhraBanner: e.target.value })
                      }
                      placeholder="MHRA highlight banner heading..."
                      className="w-full px-3 py-1.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs font-semibold text-amber-950"
                    />
                    <textarea
                      rows={7}
                      value={noticesDraft.mhraText}
                      onChange={(e) =>
                        setNoticesDraft({ ...noticesDraft, mhraText: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 leading-relaxed"
                    />
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2.5">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      4. Terms &amp; UK GDPR Privacy Notice
                    </label>
                    <textarea
                      rows={8}
                      value={noticesDraft.termsText}
                      onChange={(e) =>
                        setNoticesDraft({ ...noticesDraft, termsText: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm"
                  >
                    Save &amp; Publish Bottom Website Notices
                  </button>
                </div>
              </form>
            )}

            {/* ADMIN TAB 8: TEAM MANAGEMENT, OWN PROFILE & PASSWORD */}
            {adminTab === 'team' && (
              <div className="space-y-6">
                {/* My Profile & Password Card */}
                <form
                  onSubmit={handleUpdateOwnProfile}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-emerald-600" />
                        <span>My Admin Profile &amp; Password</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Passwords are encrypted by Google Firebase Authentication and never stored in plain text.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendPasswordReset}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Send Password Reset Email</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        My Role
                      </label>
                      <input
                        type="text"
                        disabled
                        value={activeAdminProfile.role}
                        className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Login Email Address
                      </label>
                      <input
                        type="email"
                        disabled
                        value={ownProfileForm.email}
                        className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-500"
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
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        New Password (Optional, min 6 chars)
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
                        placeholder="Leave blank to keep current"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-2xs"
                    >
                      Save My Details &amp; Password
                    </button>
                  </div>
                </form>

                {/* Team Roster + Add New Member */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>Authorised Clinical Admin Team ({adminUsers.length})</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        All listed team members can sign in from any computer or phone and publish updates to the cloud.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {adminUsers.map((u) => (
                        <div
                          key={u.id}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900">{u.name}</span>
                              {u.email.toLowerCase() === activeAdminProfile.email.toLowerCase() && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 truncate">
                              {u.email} • Added {u.addedAt}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateAdminRole(u.id, e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700"
                            >
                              <option value="Clinical Lead (Super Admin)">
                                Clinical Lead (Super Admin)
                              </option>
                              <option value="Content Editor">Content Editor</option>
                              <option value="Clinical Reviewer">Clinical Reviewer</option>
                            </select>

                            {adminUsers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAdminUser(u.id)}
                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                                title="Remove team member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cloud Governance Audit Log */}
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
              </div>
            )}
          </div>
        )}
      </main>

      {/* ==========================================
          FOOTER: GOVERNANCE, COPYRIGHT, RESOURCES & FEEDBACK
         ========================================== */}
      <footer className="border-t border-slate-200/80 bg-white py-5 px-4 sm:px-6 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col gap-3 text-xs text-slate-500">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2">
            <span className="text-center md:text-left">
              © {new Date().getFullYear()} <strong>PaedTraches.co.uk</strong> ({siteNotices.version}) — {siteNotices.footerNotice}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-between gap-3 pt-2 border-t border-slate-100">
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
                    moduleTitle:
                      activeTopTab === 'learning' && learningSectionTab === 'modules' && activeModule
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

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setLegalModalTab('disclaimer');
                  setShowGovernanceModal(true);
                }}
                className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2"
              >
                Governance
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => {
                  setLegalModalTab('copyright');
                  setShowGovernanceModal(true);
                }}
                className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2"
              >
                Copyright &amp; IP
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => {
                  setLegalModalTab('terms');
                  setShowGovernanceModal(true);
                }}
                className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2"
              >
                Terms &amp; Privacy
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
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
          MODAL 0C: WEBSITE ISSUES & GENERAL FEEDBACK
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
          MODAL 1: CLASSIC ROADSIDE TOOLS (SIZER, TUBE ID, TROUBLESHOOT, GO-BAG & FULL A&E PRE-ALERT)
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
                type="button"
                onClick={() => setActiveToolModal(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CLASSIC TUBE & HARDWARE ID (WITH OFFLINE UPLOADED PHOTOS) */}
            {activeToolModal === 'hardware' && (
              <div className="space-y-3.5">
                <p className="text-xs text-slate-500">
                  Rapid bedside identification of common paediatric tracheostomy tubes, sterile-water cuffs, and hub attachments (uploaded photos load offline without Wi-Fi).
                </p>
                <div className="space-y-3">
                  {tubeHardwareList.map((hw) => {
                    const isHighlighted = highlightedTubeId === hw.id;
                    return (
                      <div
                        key={hw.id}
                        className={`p-4 rounded-2xl border space-y-2.5 transition ${
                          isHighlighted
                            ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-200'
                            : 'bg-slate-50/80 border-slate-200/90'
                        }`}
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
                              <img src={hw.imageUrl} alt={hw.name} className="w-full h-auto block" />
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
                    );
                  })}
                </div>
              </div>
            )}

            {/* CLASSIC AIRWAY TROUBLESHOOTING MATRIX (PILL SELECTOR) */}
            {activeToolModal === 'troubleshoot' &&
              (() => {
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
                            activeIssue.id === item.id
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

            {/* TUBE & SUCTION SIZING CALCULATOR */}
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
            )}

            {/* EMERGENCY GO-BAG CHECKLIST */}
            {activeToolModal === 'checklist' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Verify all essential paediatric tracheostomy emergency equipment prior to transit.
                  </p>
                  <button
                    type="button"
                    onClick={() => setBagChecked({})}
                    className="text-xs font-semibold text-slate-500 hover:text-rose-600 shrink-0"
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
                          setBagChecked((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
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

            {/* CLASSIC FULL PAEDIATRIC A&E / ENT PRE-ALERT BUILDER */}
            {activeToolModal === 'handover' &&
              (() => {
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
                  interventionsList.length > 0 && `Interventions: ${interventionsList.join(', ')}`,
                  obsList.length > 0 && `Obs: ${obsList.join(', ')}`,
                  handoverForm.cprPerformed &&
                    `CPR: Performed${formattedCycles ? ` (${formattedCycles})` : ''}`,
                  givenDrugsList.length > 0 &&
                    `ALS drugs given:\n${givenDrugsList.map((g) => `- ${g}`).join('\n')}`,
                  travellingList.length > 0 && `Travelling with: ${travellingList.join(', ')}`
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
                                      <span
                                        className={entry.given ? 'font-semibold text-slate-900' : ''}
                                      >
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
                            isRedAirway ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
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
                                CPR Performed{formattedCycles ? ` (${formattedCycles})` : ''}
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
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText(copyablePreAlertText).catch(() => {});
                        } else {
                          const ta = document.createElement('textarea');
                          ta.value = copyablePreAlertText;
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand('copy');
                          document.body.removeChild(ta);
                        }
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
          MODAL 2: CLASSIC FLOWCHART STEP INSPECTOR
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
                type="button"
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
                type="button"
                onClick={() => setFlowchartInspectNode(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
              <button
                type="button"
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
          MODAL 3: UK CLINICAL GOVERNANCE, COPYRIGHT, TERMS & PRIVACY HUB
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
                type="button"
                onClick={() => setShowGovernanceModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
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
                type="button"
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
                type="button"
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
                type="button"
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
                      <strong className="text-slate-800">{siteNotices.version}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Review Cycle:</span>
                      <strong className="text-slate-800">
                        Reviewed {siteNotices.lastReviewed} (Due {siteNotices.nextReviewDue})
                      </strong>
                    </div>
                  </div>
                  <RichFormattedText text={siteNotices.disclaimerText} />
                </div>
              )}

              {legalModalTab === 'copyright' && (
                <div className="space-y-3">
                  {siteNotices.copyrightBanner && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-medium">
                      <strong>{siteNotices.copyrightBanner}</strong>
                    </div>
                  )}
                  <RichFormattedText text={siteNotices.copyrightText} />
                </div>
              )}

              {legalModalTab === 'mhra' && (
                <div className="space-y-3">
                  {siteNotices.mhraBanner && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-medium">
                      <strong>{siteNotices.mhraBanner}</strong>
                    </div>
                  )}
                  <RichFormattedText text={siteNotices.mhraText} />
                </div>
              )}

              {legalModalTab === 'terms' && (
                <div className="space-y-3">
                  <RichFormattedText text={siteNotices.termsText} />
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowGovernanceModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs sm:text-sm"
              >
                Acknowledge &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 4: CREATE NEW CLINICAL PATHWAY (ADMIN)
         ========================================== */}
      {showNewPathwayModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewPathway}
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create New Clinical Pathway</h3>
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
                onChange={(e) => setNewPathwayForm({ ...newPathwayForm, title: e.target.value })}
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
                onChange={(e) => setNewPathwayForm({ ...newPathwayForm, subtitle: e.target.value })}
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
                  onChange={(e) => setNewPathwayForm({ ...newPathwayForm, theme: e.target.value })}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Badge Label</label>
              <input
                type="text"
                value={newPathwayForm.badge}
                onChange={(e) => setNewPathwayForm({ ...newPathwayForm, badge: e.target.value })}
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
          MODAL 5: CREATE NEW LEARNING MODULE (ADMIN)
         ========================================== */}
      {showNewModuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewModule}
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create New Learning Module</h3>
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
                onChange={(e) => setNewModuleForm({ ...newModuleForm, title: e.target.value })}
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
                  onChange={(e) => setNewModuleForm({ ...newModuleForm, category: e.target.value })}
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
                  onChange={(e) => setNewModuleForm({ ...newModuleForm, duration: e.target.value })}
                  placeholder="5 min read"
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
                onChange={(e) => setNewModuleForm({ ...newModuleForm, summary: e.target.value })}
                placeholder="What will clinicians learn in this module?"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Clinical Setting Filter Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {MODULE_SETTING_FILTERS.filter((f) => f.id !== 'all').map((flt) => {
                  const active = (newModuleForm.settingTags || []).includes(flt.id);
                  return (
                    <button
                      key={flt.id}
                      type="button"
                      onClick={() => {
                        const curr = newModuleForm.settingTags || [];
                        const next = curr.includes(flt.id)
                          ? curr.filter((x) => x !== flt.id)
                          : [...curr, flt.id];
                        setNewModuleForm({
                          ...newModuleForm,
                          settingTags: next.length > 0 ? next : [flt.id]
                        });
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        active
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {flt.label}
                    </button>
                  );
                })}
              </div>
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
          MODAL 6: PAEDTRACHES CPD CERTIFICATE GENERATOR (LOCAL ONLY — ZERO PII)
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
                type="button"
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
    </div>
  );
}
