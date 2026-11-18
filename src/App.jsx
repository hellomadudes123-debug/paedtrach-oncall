import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection
} from 'firebase/firestore';
import {
  Activity,
  BookOpen,
  Settings,
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
  GitBranch,
  Video,
  Image as ImageIcon,
  X,
  ShieldAlert,
  HeartPulse,
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
  Share2,
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
  History
} from 'lucide-react';

// ==========================================
// CLOUD DATABASE INITIALIZATION
// ==========================================
const getSavedCustomFirebaseConfig = () => {
  try {
    const raw = localStorage.getItem('paedtrach_custom_firebase_config');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const firebaseConfig = { 
    apiKey: "AIzaSyCJr5EtomUlvIQiqyOXw7jG7K9W4bUulgk",
    authDomain: "paedtrach-oncall.firebaseapp.com",
    projectId: "paedtrach-oncall",
    storageBucket: "paedtrach-oncall.firebasestorage.app",
    messagingSenderId: "928358075073",
    appId: "1:928358075073:web:82b4cc602d749a32406240"
  };
const app = firebaseConfig ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'paedtrach-oncall-pwa';

// ==========================================
// INITIAL CLINICAL DATA (CLEAN TITLES + GUIDELINE LINKS)
// ==========================================
const INITIAL_ADMIN_USERS = [
  {
    id: 'adm-lead',
    name: 'Lead Clinical Editor',
    email: 'lead@paedtrach.org.uk',
    role: 'Clinical Lead (Super Admin)',
    passcode: 'trach999',
    addedAt: '2025-01-15'
  },
  {
    id: 'adm-edu',
    name: 'Practice Educator',
    email: 'educator@ambulance.nhs.uk',
    role: 'Content Editor',
    passcode: 'paeds123',
    addedAt: '2025-02-01'
  }
];

const INITIAL_GOVERNANCE_META = {
  version: 'v3.2 (2025/26 Edition)',
  clinicalLead: 'Paediatric Airway & Pre-Hospital Education Group',
  lastReviewed: '2025-02-18',
  nextReviewDue: '2026-02-18',
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
    summary: 'Understand the anatomical difference between a patent upper airway (Green) and a neck-only airway (Red).',
    sections: [
      {
        id: 'sec-anat-1',
        heading: 'Why NTSP Colour Coding Matters on Scene',
        body: 'In a paediatric tracheostomy emergency, your critical first question is: "Can this child be oxygenated and ventilated via the mouth and nose if the tracheostomy tube is blocked or removed?" The National Tracheostomy Safety Project (NTSP) divides patients into Green and Red pathways so crews can tell at a glance.',
        pearl: 'Always check the colour of the child’s NTSP Bedhead Sign or caregiver emergency sheet inside their Go-Bag on arrival.',
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
            description: 'Animated sagittal comparison showing airflow pathways in standard tracheostomy versus complete upper airway disconnection.'
          }
        ]
      },
      {
        id: 'sec-anat-2',
        heading: 'Green Pathway: Tracheostomy (Upper Airway Connected)',
        body: 'In almost all children with a tracheostomy, the larynx remains present above the stoma. Even if the child has subglottic stenosis or tracheomalacia, oxygen can usually pass from the mouth and nose into the lungs once a blocked tube is removed. When ventilating via a face mask, you must gently occlude the open neck stoma with sterile gauze so air does not escape out of the neck.',
        pearl: 'Avoid hyperextending an infant’s neck—keep the head in neutral alignment with a thin shoulder roll.',
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
        body: 'When there is no anatomical connection between the pharynx and the trachea (or complete Grade 4 subglottic obliteration), the neck stoma is the child’s ONLY airway. Never cover or occlude the stoma, and do not attempt oral BVM ventilation or oral intubation unless explicitly directed by the child’s specialist care plan.',
        pearl: 'To ventilate an open stoma directly when a tube cannot be replaced, seal a circular neonatal face mask or size 1 i-gel over the neck stoma.',
        images: [],
        videos: [
          {
            id: 'vid-anat-2',
            title: 'Ventilating an Open Neck Stoma with a Neonatal Mask',
            duration: '02:20',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            description: 'Demonstration of achieving an airtight seal over a paediatric neck stoma using a circular neonatal silicone mask.'
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
    summary: 'Learn how to quickly read the bedside emergency card, identify single-lumen paediatric tubes, and remove speaking valves.',
    sections: [
      {
        id: 'sec-bed-1',
        heading: '3 Key Numbers on the Bedhead Sign',
        body: 'When arriving at the bedside, look immediately for three numbers on the child’s emergency sheet: 1) Tube Inner Diameter (ID in mm, e.g. 4.0 mm), 2) Suction Catheter Size (e.g. 8 Fr) and Pre-Measured Suction Depth (e.g. 8.0 cm), and 3) Upper Airway Grade / Patency details.',
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
        body: 'Unlike adult tracheostomy tubes, neonatal and small paediatric tubes (2.5 mm to 5.0 mm ID) are almost always single-lumen tubes without an inner cannula. Furthermore, many children wear a colourful one-way speaking valve (e.g. Passy-Muir) or an HME filter on the 15 mm hub. In any respiratory distress, strip all attachments down to the bare white 15 mm tracheostomy hub immediately.',
        pearl: 'A speaking valve is a one-way valve—it lets air in but blocks exhalation through the tube. If the upper airway swells, severe air trapping occurs unless removed.',
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
            description: 'Hands-on overview of uncuffed Shiley and water-cuffed Bivona TTS paediatric tubes, obturators, and speaking valves.'
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
    summary: 'Master the suction catheter sizing rule (ID × 2), safe suction depth, and the two-attempt emergency tube replacement protocol.',
    sections: [
      {
        id: 'sec-suc-1',
        heading: 'Suction Catheter Sizing: Tube ID (mm) × 2 = French (Fr)',
        body: 'Double the tracheostomy tube internal diameter (mm) to find the maximum French catheter size. For example, a 4.0 mm tube requires an 8 Fr suction catheter. Only advance the catheter to the child’s pre-measured depth (typically 6 to 11 cm) so you do not traumatise the carina, and apply suction only while withdrawing for 5 to 10 seconds.',
        pearl: 'Never use a rigid Yankauer sucker inside a tracheostomy tube—only use flexible, graduations-marked suction catheters.',
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
        body: 'When inserting a spare tube, the solid plastic obturator sits inside the tube to guide its curved tip smoothly through the stoma. Remember: the child CANNOT breathe while the obturator is inside the lumen. The instant the tube flange reaches the neck skin, hold the flange steady with one hand and pull the obturator out with the other.',
        pearl: 'If the same-size spare tube will not slide in easily, do not force it—immediately switch to the 0.5 mm smaller downsize tube.',
        images: [],
        videos: [
          {
            id: 'vid-suc-1',
            title: 'Step-by-Step: Safe Suctioning & Obturator Removal',
            duration: '05:50',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            description: 'Real-time simulation of blocked tube removal, stoma insertion using a curved motion, and immediate obturator withdrawal.'
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

// Helper to strip any accidental legacy "0.", "1A.", "2B." prefixes from user-saved localStorage
const cleanStepTitle = (rawTitle = '') => {
  return rawTitle.replace(/^[0-9]+[A-Za-z]?\.\s*/, '').trim();
};

const formatTime = (totalSec) => {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export default function App() {
  // Navigation State: 'oncall' | 'learning' | 'admin'
  const [appMode, setAppMode] = useState('oncall');
  // Sub-view on On-Call Home: 'main' (3 core emergency pathways) | 'extra' (routine & extra pathways)
  const [onCallSubView, setOnCallSubView] = useState('main');

  // ==========================================
  // FIREBASE REAL-TIME CLOUD SYNC STATE
  // ==========================================
  const [fbUser, setFbUser] = useState(null);
  const [cloudStatus, setCloudStatus] = useState('connecting'); // 'connecting' | 'synced' | 'offline'
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState(null);
  const [lastUpdatedBy, setLastUpdatedBy] = useState('Clinical Lead');

  // Pathways State
  const [pathways, setPathways] = useState(INITIAL_PATHWAYS);
  // Learning Modules State
  const [learningModules, setLearningModules] = useState(INITIAL_LEARNING_MODULES);
  // Multi-Admin Users State
  const [adminUsers, setAdminUsers] = useState(INITIAL_ADMIN_USERS);
  // Audit Log State
  const [auditLogs, setAuditLogs] = useState([
    {
      id: 'log-init',
      actor: 'Lead Clinical Editor',
      action: 'Published initial NTSP & NICE aligned clinical pathways',
      timestamp: '2025-02-18 09:00'
    }
  ]);

  // 1. Authenticate with Firebase (Rule 3)
  useEffect(() => {
    if (!auth) {
      setCloudStatus('offline');
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        setCloudStatus('offline');
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setFbUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore Listener for Public App Content + Admin Roster (Rule 1 & 3)
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
            if (data.pathwaysJson) {
              setPathways(JSON.parse(data.pathwaysJson));
            }
            if (data.modulesJson) {
              setLearningModules(JSON.parse(data.modulesJson));
            }
            if (data.adminUsersJson) {
              setAdminUsers(JSON.parse(data.adminUsersJson));
            }
            if (data.auditLogsJson) {
              setAuditLogs(JSON.parse(data.auditLogsJson));
            }
            if (data.updatedAt) {
              setLastCloudSyncAt(data.updatedAt);
            }
            if (data.updatedBy) {
              setLastUpdatedBy(data.updatedBy);
            }
            setCloudStatus('synced');
          } catch (parseErr) {
            setCloudStatus('synced');
          }
        } else {
          // Seed initial cloud bundle so all devices stay in sync
          const seedPayload = {
            pathwaysJson: JSON.stringify(INITIAL_PATHWAYS),
            modulesJson: JSON.stringify(INITIAL_LEARNING_MODULES),
            adminUsersJson: JSON.stringify(INITIAL_ADMIN_USERS),
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

  // 3. Private per-device Learning Progress synced to user's anonymous UID in Firestore
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

  // Helper to push any Admin CMS change immediately to Cloud Firestore
  const publishCloudUpdate = async ({
    nextPathways = pathways,
    nextModules = learningModules,
    nextAdmins = adminUsers,
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
    setAdminUsers(nextAdmins);
    setAuditLogs(nextLogs);
    setLastCloudSyncAt(timeStr);
    setLastUpdatedBy(actorName);

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
          adminUsersJson: JSON.stringify(nextAdmins),
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

  // On-Call Mode State: null = calm Home screen; string = inside a selected pathway
  const [activePathwayId, setActivePathwayId] = useState(null);
  // 'interactive' | 'overview'
  const [pathwayViewMode, setPathwayViewMode] = useState('interactive');
  const [currentNodeId, setCurrentNodeId] = useState('gov-check');
  const [nodeHistory, setNodeHistory] = useState(['gov-check']);
  const [checkedItems, setCheckedItems] = useState({});
  // Slide-over / Modal when tapping a node in Full Flowchart view
  const [flowchartInspectNode, setFlowchartInspectNode] = useState(null);
  // Minimalist collapsible NICE / Guideline References drawer at bottom of pathway
  const [showPathwayRefs, setShowPathwayRefs] = useState(false);

  // Roadside Tools Modal State: null | 'calculator' | 'checklist'
  const [activeToolModal, setActiveToolModal] = useState(null);
  const [selectedTubeIdSize, setSelectedTubeIdSize] = useState('4.0');
  const [bagChecked, setBagChecked] = useState({});

  // 2-Minute CPR Cycle Timer
  const [showCprTimer, setShowCprTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Learning Mode State (Multi-section navigation + Hidden quiz until final section finished)
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState(null);

  // Modals for PWA install & Comprehensive Legal/Regulatory Hub
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [showGovernanceModal, setShowGovernanceModal] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState('disclaimer'); // 'disclaimer' | 'terms' | 'privacy' | 'mhra'

  // ==========================================
  // ADMIN CMS STATE (MULTI-USER + PATHWAYS + MODULES + TEAM)
  // ==========================================
  const [adminTab, setAdminTab] = useState('pathways'); // 'pathways' | 'modules' | 'team' | 'publish'
  const [cmsNotification, setCmsNotification] = useState(null);

  // Multi-User Admin Authentication State
  const [currentAdminUser, setCurrentAdminUser] = useState(null);
  const [loginEmailInput, setLoginEmailInput] = useState('lead@paedtrach.org.uk');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Add New Admin Team Member Form
  const [newAdminForm, setNewAdminForm] = useState({
    name: '',
    email: '',
    role: 'Content Editor',
    passcode: ''
  });
  const [importJsonText, setImportJsonText] = useState('');
  const [customFirebaseJsonInput, setCustomFirebaseJsonInput] = useState(() => {
    try {
      return localStorage.getItem('paedtrach_custom_firebase_config') || '';
    } catch (e) {
      return '';
    }
  });

  // 1. Admin Pathway Builder State
  const [adminPathwayId, setAdminPathwayId] = useState('ntsp-green');
  const [showNewPathwayModal, setShowNewPathwayModal] = useState(false);
  const [newPathwayForm, setNewPathwayForm] = useState({
    title: '',
    subtitle: '',
    category: 'extra',
    theme: 'amber',
    badge: 'Routine & Secondary Care'
  });
  const [editingNodeId, setEditingNodeId] = useState(null);
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
  // New Guideline Reference Draft for Pathway
  const [newRefDraft, setNewRefDraft] = useState({
    title: '',
    source: 'NICE / NTSP Guidance',
    url: ''
  });

  // 2. Admin Learning Module Builder State
  const [adminModuleId, setAdminModuleId] = useState(() => INITIAL_LEARNING_MODULES[0].id);
  const [showNewModuleModal, setShowNewModuleModal] = useState(false);
  const [newModuleForm, setNewModuleForm] = useState({
    title: '',
    category: 'Clinical Skills',
    duration: '5 min read',
    summary: ''
  });
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [sectionForm, setSectionForm] = useState({
    heading: '',
    body: '',
    pearl: '',
    images: [],
    videos: []
  });
  const [newImageDraft, setNewImageDraft] = useState({ title: '', caption: '', url: '' });
  const [newVideoDraft, setNewVideoDraft] = useState({
    title: '',
    duration: '03:00',
    url: '',
    description: ''
  });
  const [newQuizDraft, setNewQuizDraft] = useState({
    q: '',
    opt0: '',
    opt1: '',
    opt2: '',
    correct: 0,
    explanation: ''
  });

  const isAdminAuthenticated = !!currentAdminUser;

  const notifyCms = (msg) => {
    setCmsNotification(msg);
    setTimeout(() => setCmsNotification(null), 3500);
  };

  const handleAdminLoginSubmit = (e) => {
    e.preventDefault();
    const cleanEmail = loginEmailInput.trim().toLowerCase();
    const matchedAdmin = adminUsers.find(
      (u) =>
        (u.email.toLowerCase() === cleanEmail || u.name.toLowerCase() === cleanEmail) &&
        u.passcode === loginPasswordInput
    );

    if (matchedAdmin) {
      setCurrentAdminUser(matchedAdmin);
      setLoginPasswordInput('');
      setLoginError('');
    } else {
      setLoginError('Invalid email or passcode. Select one of the registered admin accounts below.');
    }
  };

  const handleAdminLogout = () => {
    setCurrentAdminUser(null);
    setLoginPasswordInput('');
    setLoginError('');
    setAppMode('oncall');
  };

  const handleAddAdminTeamMember = (e) => {
    e.preventDefault();
    if (
      !newAdminForm.name.trim() ||
      !newAdminForm.email.trim() ||
      newAdminForm.passcode.trim().length < 4
    ) {
      notifyCms('Please provide name, email, and a passcode (min 4 characters).');
      return;
    }
    const exists = adminUsers.some(
      (u) => u.email.toLowerCase() === newAdminForm.email.trim().toLowerCase()
    );
    if (exists) {
      notifyCms('An admin user with this email already exists.');
      return;
    }
    const createdUser = {
      id: `adm-${Date.now()}`,
      name: newAdminForm.name.trim(),
      email: newAdminForm.email.trim().toLowerCase(),
      role: newAdminForm.role,
      passcode: newAdminForm.passcode.trim(),
      addedAt: new Date().toISOString().slice(0, 10)
    };
    const nextAdmins = [...adminUsers, createdUser];
    publishCloudUpdate({
      nextAdmins,
      actionDescription: `Added admin team member ${createdUser.name} (${createdUser.role})`
    });
    setNewAdminForm({
      name: '',
      email: '',
      role: 'Content Editor',
      passcode: ''
    });
    notifyCms(`Added ${createdUser.name} to Admin Team & synced to cloud`);
  };

  const handleRemoveAdminUser = (targetId) => {
    if (adminUsers.length <= 1) {
      notifyCms('Cannot remove the last remaining administrator.');
      return;
    }
    const target = adminUsers.find((u) => u.id === targetId);
    const nextAdmins = adminUsers.filter((u) => u.id !== targetId);
    publishCloudUpdate({
      nextAdmins,
      actionDescription: `Removed admin user ${target?.name || targetId}`
    });
    notifyCms('Removed admin user from roster');
  };

  const handleDownloadBackupJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      pathways,
      learningModules,
      adminUsers
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paedtrach-cloud-backup.json';
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
          nextAdmins: Array.isArray(parsed.adminUsers) ? parsed.adminUsers : adminUsers,
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
  <meta name="apple-mobile-web-app-title" content="PaedTrach" />
  <title>PaedTrach OnCall — Paediatric Tracheostomy Guide</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#F8FAFC] text-[#0F172A] font-sans antialiased">
  <div id="app" class="max-w-3xl mx-auto px-4 py-8"></div>
  <script>
    const BUNDLE = ${JSON.stringify(currentDataBundle, null, 2)};
    const root = document.getElementById('app');
    root.innerHTML = \`
      <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Standalone Export Bundle</span>
            <h1 class="text-2xl font-bold text-slate-900 mt-2">PaedTrach OnCall Clinical Bundle</h1>
            <p class="text-sm text-slate-500">Exported \${new Date(BUNDLE.exportedAt).toLocaleString('en-GB')} • \${BUNDLE.pathways.length} Pathways & \${BUNDLE.learningModules.length} Learning Modules included.</p>
          </div>
        </div>
        <div class="space-y-3">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Included Clinical Pathways</h2>
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

  // Filtered Core vs Extra Pathways
  const coreEmergencyPathways = useMemo(
    () => pathways.filter((p) => p.category !== 'extra'),
    [pathways]
  );
  const extraRoutinePathways = useMemo(
    () => pathways.filter((p) => p.category === 'extra'),
    [pathways]
  );

  // Derived active pathway & node
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

  // Open a pathway from the Home or Extra Pathways screen
  const handleOpenPathway = (pathwayId) => {
    const target = pathways.find((p) => p.id === pathwayId);
    if (!target) return;
    setActivePathwayId(pathwayId);
    const startId = target.startNodeId || target.nodes[0]?.id;
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

  // Clean daylight clinical theme styles (supports green, red, blue, amber, slate)
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
  // ADMIN CMS: PATHWAY, NODE & GUIDELINE REFERENCE HANDLERS
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

  // ==========================================
  // ADMIN CMS: LEARNING MODULE & SECTION HANDLERS
  // ==========================================
  const adminModule = useMemo(
    () => learningModules.find((m) => m.id === adminModuleId) || learningModules[0],
    [learningModules, adminModuleId]
  );

  const resetSectionForm = () => {
    setEditingSectionId(null);
    setSectionForm({
      heading: '',
      body: '',
      pearl: '',
      images: [],
      videos: []
    });
    setNewImageDraft({ title: '', caption: '', url: '' });
    setNewVideoDraft({ title: '', duration: '03:00', url: '', description: '' });
  };

  const loadSectionIntoForm = (sec) => {
    setEditingSectionId(sec.id);
    setSectionForm({
      heading: sec.heading || '',
      body: sec.body || '',
      pearl: sec.pearl || '',
      images: sec.images ? [...sec.images] : [],
      videos: sec.videos ? [...sec.videos] : []
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
      duration: newModuleForm.duration.trim() || '5 min read',
      summary: newModuleForm.summary.trim() || 'Educational module for paediatric tracheostomy care.',
      sections: [
        {
          id: `sec-${Date.now()}`,
          heading: 'Introduction & Key Concepts',
          body: 'Add your clinical content, photos, and videos to this section using the editor.',
          pearl: 'Always check the patient’s Bedhead Sign and follow local Trust guidelines.',
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
      description: newVideoDraft.description.trim() || 'Clinical training video walkthrough.'
    };
    setSectionForm((prev) => ({
      ...prev,
      videos: [...prev.videos, vidItem]
    }));
    setNewVideoDraft({ title: '', duration: '03:00', url: '', description: '' });
  };

  const handleSaveSection = (e) => {
    e.preventDefault();
    if (!sectionForm.heading.trim()) return;

    const secObj = {
      id: editingSectionId || `sec-${Date.now()}`,
      heading: sectionForm.heading.trim(),
      body: sectionForm.body.trim(),
      pearl: sectionForm.pearl.trim(),
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

  const handleResetFactoryData = () => {
    publishCloudUpdate({
      nextPathways: INITIAL_PATHWAYS,
      nextModules: INITIAL_LEARNING_MODULES,
      nextAdmins: INITIAL_ADMIN_USERS,
      actionDescription: 'Reset pathways and modules to factory NTSP defaults'
    });
    notifyCms('Restored default clinical pathways & synced to Cloud');
  };

  const currentSizingRow = useMemo(
    () => SUCTION_SIZING_TABLE.find((r) => r.id === selectedTubeIdSize) || SUCTION_SIZING_TABLE[3],
    [selectedTubeIdSize]
  );

  const activeModule = useMemo(
    () => learningModules.find((m) => m.id === activeModuleId) || null,
    [learningModules, activeModuleId]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* ==========================================
          CLEAN, MINIMAL TOP NAVIGATION BAR
          ========================================== */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo (Clicking returns to On-Call Home) */}
          <button
            onClick={() => {
              setAppMode('oncall');
              setActivePathwayId(null);
              setOnCallSubView('main');
            }}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm group-hover:bg-emerald-700 transition">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-slate-900 block leading-none">
                  PaedTrach
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    cloudStatus === 'synced'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                  title={
                    cloudStatus === 'synced'
                      ? 'Live Cloud Sync Active across all devices'
                      : 'Offline Ready Mode'
                  }
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      cloudStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {cloudStatus === 'synced' ? 'Cloud Live' : 'Offline Ready'}
                  </span>
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                On-Call Guide
              </span>
            </div>
          </button>

          {/* Center Segmented Control: [ 🚨 On-Call ] | [ 📚 Learn ] */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            <button
              onClick={() => {
                setAppMode('oncall');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                appMode === 'oncall'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span role="img" aria-label="On-Call">🚨</span>
              <span>On-Call</span>
            </button>

            <button
              onClick={() => {
                setAppMode('learning');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                appMode === 'learning'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span role="img" aria-label="Learn">📚</span>
              <span>Learn</span>
            </button>
          </div>

          {/* Subtle Right Actions: Save App & Admin */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowPwaModal(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Save to Home Screen"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setAppMode(appMode === 'admin' ? 'oncall' : 'admin');
                resetAdminForm();
                resetSectionForm();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                appMode === 'admin'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Multi-User Admin Login & Content Manager"
            >
              {isAdminAuthenticated ? (
                <Unlock className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isAdminAuthenticated ? currentAdminUser.name.split(' ')[0] : 'Admin'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ==========================================
          MAIN CONTENT AREA
          ========================================== */}
      <main className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        {/* ==========================================
            1A. ON-CALL HOME VIEW (CALM, UNCLUTTERED)
            ========================================== */}
        {appMode === 'oncall' && !activePathwayId && onCallSubView === 'main' && (
          <div className="space-y-10">
            {/* Calm Header */}
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Paediatric Tracheostomy Guide
              </h1>
              <p className="text-sm sm:text-base text-slate-500">
                Select an emergency clinical pathway or open a quick roadside sizing tool.
              </p>
            </div>

            {/* Core Emergency Pathway Cards */}
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Core Emergency Pathways
              </h2>

              <div className="space-y-3.5">
                {coreEmergencyPathways.map((pathway) => {
                  const style = getThemeStyles(pathway.theme);
                  return (
                    <button
                      key={pathway.id}
                      onClick={() => handleOpenPathway(pathway.id)}
                      className={`w-full text-left bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 group ${style.topBar} ${style.cardHover}`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {pathway.badge}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-slate-950">
                          {pathway.title}
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          {pathway.subtitle}
                        </p>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-700 shrink-0 transition">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Clean Button/Card Leading to Extra Pathways & Routine Care */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setOnCallSubView('extra');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full text-left bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-base">
                          Extra Pathways & Routine Care
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {extraRoutinePathways.length} available
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Routine suctioning, humidification, post-decannulation & custom pathways
                      </p>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-700 shrink-0 transition">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>
              </div>
            </div>

            {/* Clean "Quick Roadside Tools" Section */}
            <div className="space-y-3.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Quick Roadside Tools
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  onClick={() => setActiveToolModal('calculator')}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm sm:text-base">
                        Suction & Tube Sizer
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Catheter Fr, safe depth & downsize
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                </button>

                <button
                  onClick={() => setActiveToolModal('checklist')}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                      <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm sm:text-base">
                        Go-Bag Checklist
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Verify essential bedside equipment
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                </button>
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
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Extra Pathways & Routine Care
              </h1>
              <p className="text-sm text-slate-500">
                Secondary clinical pathways for routine suctioning, humidification, and post-decannulation transport.
              </p>
            </div>

            <div className="space-y-3.5">
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
            1C. ACTIVE PATHWAY VIEW (INTERACTIVE STEP-BY-STEP OR FULL FLOWCHART + MINIMAL NICE REFERENCES)
            ========================================== */}
        {appMode === 'oncall' && activePathwayId && (
          <div className="space-y-5">
            {/* Top Bar: Back Button + View Toggle + Optional CPR Timer */}
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
                  <span>{timerRunning ? formatTime(timerSeconds) : '2m CPR Timer'}</span>
                </button>

                <button
                  onClick={() => setActiveToolModal('calculator')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
                >
                  <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Sizer</span>
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

            {/* Compact Collapsible 2-Minute CPR Cycle Bar */}
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

            {/* Pathway Title Banner */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    getThemeStyles(activePathway.theme).pill
                  }`}
                >
                  {activePathway.badge}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
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

            {/* VIEW 1: INTERACTIVE STEP-BY-STEP CARD */}
            {pathwayViewMode === 'interactive' && currentNode && (
              <div
                className={`bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 ${
                  getThemeStyles(activePathway.theme).topBar
                }`}
              >
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Step {nodeHistory.length}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
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
                      <button
                        onClick={handleRestartPathway}
                        className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100"
                      >
                        Restart Pathway
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: FULL FLOWCHART OVERVIEW */}
            {pathwayViewMode === 'overview' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 px-1">
                  Tap any step card below to inspect its full checklist or jump directly to that step.
                </p>

                <div className="relative space-y-3 before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
                  {activePathway.nodes.map((node) => {
                    const isCurrent = node.id === currentNodeId;
                    const yesTarget = activePathway.nodes.find((n) => n.id === node.yesId);
                    const noTarget = activePathway.nodes.find((n) => n.id === node.noId);
                    const nextTarget = activePathway.nodes.find((n) => n.id === node.nextId);

                    return (
                      <div key={node.id} className="relative pl-12">
                        <div
                          className={`absolute left-[19px] top-6 w-3 h-3 rounded-full border-2 ${
                            isCurrent
                              ? 'bg-emerald-600 border-emerald-200 ring-4 ring-emerald-100'
                              : 'bg-white border-slate-400'
                          }`}
                        />

                        <button
                          onClick={() => setFlowchartInspectNode(node)}
                          className={`w-full text-left bg-white rounded-2xl p-4 sm:p-5 border transition shadow-2xs hover:shadow-md ${
                            isCurrent
                              ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                              : 'border-slate-200/90 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <h3 className="text-base font-bold text-slate-900">
                                {cleanStepTitle(node.title)}
                              </h3>
                              {node.subtitle && (
                                <p className="text-xs sm:text-sm text-slate-500">
                                  {node.subtitle}
                                </p>
                              )}
                            </div>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                Current
                              </span>
                            )}
                          </div>

                          {(yesTarget || noTarget || nextTarget) && (
                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
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
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==========================================
                MINIMALIST COLLAPSIBLE NICE / NTSP / JRCALC GUIDELINE DRAWER AT BOTTOM OF PATHWAY
                ========================================== */}
            <div className="pt-2">
              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
                <button
                  onClick={() => setShowPathwayRefs((prev) => !prev)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      NICE, NTSP & Evidence Guidelines ({(activePathway.references || []).length})
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
                  <div className="px-4 pb-3.5 pt-1 border-t border-slate-100 space-y-2 bg-slate-50/50">
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
            2. LEARNING MODULES MODE (MULTI-SECTION + LOCKED QUIZ UNTIL COMPLETED)
            ========================================== */}
        {appMode === 'learning' && (
          <div className="space-y-6">
            {!activeModule ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                      Learning Modules
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500">
                      Multi-section clinical guides with diagrams, videos, and end-of-module self-assessment.
                    </p>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shrink-0">
                    {completedModules.length} / {learningModules.length} Completed
                  </div>
                </div>

                <div className="space-y-3.5">
                  {learningModules.map((mod) => {
                    const isDone = completedModules.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        onClick={() => {
                          setActiveModuleId(mod.id);
                          setActiveSectionIndex(0);
                          setQuizUnlocked(false);
                          setQuizAnswers({});
                          setQuizSubmitted(false);
                          setPlayingVideoId(null);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full text-left bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition flex items-center justify-between gap-4 group"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              {mod.category}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {mod.duration} • {(mod.sections || []).length} sections
                            </span>
                            {isDone && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition">
                            {mod.title}
                          </h3>
                          <p className="text-sm text-slate-500 leading-relaxed">
                            {mod.summary}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Active Multi-Section Learning Module View */
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setActiveModuleId(null)}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 py-1.5 px-3 rounded-xl hover:bg-slate-200/60 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Modules</span>
                  </button>

                  <span className="text-xs font-semibold text-slate-500">
                    Section {activeSectionIndex + 1} of {activeModule.sections.length}
                  </span>
                </div>

                {/* Progress Bar across sections */}
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

                {/* Module Header */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    {activeModule.category}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {activeModule.title}
                  </h1>
                </div>

                {/* Current Section Card (When not in Quiz view) */}
                {!quizUnlocked && activeModule.sections[activeSectionIndex] && (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
                    {(() => {
                      const sec = activeModule.sections[activeSectionIndex];
                      return (
                        <>
                          <div className="space-y-3">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                              Section {activeSectionIndex + 1}
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                              {sec.heading}
                            </h2>
                            <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line">
                              {sec.body}
                            </p>
                          </div>

                          {sec.pearl && (
                            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs sm:text-sm text-emerald-950 font-medium">
                              <strong>Clinical Takeaway:</strong> {sec.pearl}
                            </div>
                          )}

                          {/* Section Photos & Diagrams */}
                          {sec.images && sec.images.length > 0 && (
                            <div className="space-y-3 pt-2">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Clinical Diagrams & Photos
                              </h3>
                              <div className="grid grid-cols-1 gap-4">
                                {sec.images.map((img) => (
                                  <div
                                    key={img.id}
                                    className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50"
                                  >
                                    <img
                                      src={img.url}
                                      alt={img.title}
                                      className="w-full h-52 sm:h-64 object-cover"
                                    />
                                    <div className="p-3.5">
                                      <div className="font-bold text-xs sm:text-sm text-slate-900">
                                        {img.title}
                                      </div>
                                      {img.caption && (
                                        <p className="text-xs text-slate-500 mt-0.5">
                                          {img.caption}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Section Videos */}
                          {sec.videos && sec.videos.length > 0 && (
                            <div className="space-y-3 pt-2">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Clinical Video Walkthroughs
                              </h3>
                              <div className="space-y-3">
                                {sec.videos.map((vid) => (
                                  <div
                                    key={vid.id}
                                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Video className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span className="font-bold text-sm text-slate-900">
                                          {vid.title}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                                          {vid.duration}
                                        </span>
                                      </div>
                                      {vid.description && (
                                        <p className="text-xs text-slate-500">
                                          {vid.description}
                                        </p>
                                      )}
                                    </div>
                                    <a
                                      href={vid.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0"
                                    >
                                      <Play className="w-3.5 h-3.5" />
                                      <span>Watch Video</span>
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Section Navigation Controls + Unlock Quiz on Final Section */}
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
                              <span>Previous Section</span>
                            </button>

                            {activeSectionIndex < activeModule.sections.length - 1 ? (
                              <button
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
                                onClick={() => {
                                  setQuizUnlocked(true);
                                  markModuleCompletedInCloud(activeModule.id);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm flex items-center gap-2"
                              >
                                <Sparkles className="w-4 h-4" />
                                <span>Finished Reading — Unlock Knowledge Quiz</span>
                              </button>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Unlocked Self-Assessment Quiz View */}
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

                    {activeModule.quiz.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Module marked as completed! No quiz questions are attached to this module.
                      </p>
                    ) : (
                      <div className="space-y-6">
                        {activeModule.quiz.map((qItem, qIdx) => (
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
                                      setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
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

                        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                          {quizSubmitted ? (
                            <button
                              onClick={() => {
                                setQuizSubmitted(false);
                                setQuizAnswers({});
                              }}
                              className="px-4 py-2.5 rounded-xl bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700"
                            >
                              Retry Quiz
                            </button>
                          ) : (
                            <button
                              onClick={() => setQuizSubmitted(true)}
                              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold"
                            >
                              Check Answers
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            3. ADMIN CMS (MULTI-USER LOGIN + LIVE CLOUD SYNC)
            ========================================== */}
        {appMode === 'admin' && !isAdminAuthenticated && (
          <div className="max-w-md mx-auto my-8">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Multi-User Admin Login
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Sign in with your clinical editor account to publish live cloud updates.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Admin Email or Name
                  </label>
                  <input
                    type="text"
                    required
                    value={loginEmailInput}
                    onChange={(e) => {
                      setLoginEmailInput(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="e.g., lead@paedtrach.org.uk"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Personal Passcode
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={loginPasswordInput}
                    onChange={(e) => {
                      setLoginPasswordInput(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="Enter passcode..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                  {loginError && (
                    <p className="text-xs font-semibold text-rose-600 mt-1.5">
                      {loginError}
                    </p>
                  )}
                </div>

                {/* Quick Demo Account Selector */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Registered Admin Accounts (Tap to autofill email):
                  </div>
                  <div className="space-y-1.5">
                    {adminUsers.map((u) => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => {
                          setLoginEmailInput(u.email);
                          setLoginError('');
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-xs flex items-center justify-between"
                      >
                        <span>
                          <strong>{u.name}</strong> ({u.email})
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Demo passcodes: <code className="font-mono font-bold">trach999</code> (Lead) or <code className="font-mono font-bold">paeds123</code> (Educator).
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAppMode('oncall')}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-2xs"
                  >
                    Sign In to Admin CMS
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {appMode === 'admin' && isAdminAuthenticated && (
          <div className="space-y-6">
            {/* Top Admin Header & Mode Switcher */}
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
                  <button
                    onClick={() => setAdminTab('publish')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                      adminTab === 'publish'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Cloud & Legal</span>
                  </button>
                </div>

                <button
                  onClick={handleAdminLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
                  title="Sign Out of Admin Session"
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

            {/* ==========================================
                ADMIN TAB: MULTI-USER TEAM MANAGEMENT & AUDIT LOG
                ========================================== */}
            {adminTab === 'team' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Current Admin Users Roster */}
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
                            <span className="text-sm font-bold text-slate-900">{u.name}</span>
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
                            title="Revoke Admin Access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Audit Trail of Recent Cloud Edits */}
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

                {/* Right Column: Add New Admin User Form */}
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
                      Full Name & Title *
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
                      Assign Personal Passcode (min 4 chars) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newAdminForm.passcode}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, passcode: e.target.value })
                      }
                      placeholder="e.g., airway2025"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-2xs"
                  >
                    + Add User & Sync to Cloud
                  </button>
                </form>
              </div>
            )}

            {/* ==========================================
                ADMIN TAB: CLOUD SYNC, GOOGLE SITES & UK REGULATORY COMPLIANCE
                ========================================== */}
            {adminTab === 'publish' && (
              <div className="space-y-6">
                {/* Step-by-Step Launch Checklist Card */}
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Step 1 */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        Step 1 • Cloud Database
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        Create Free Firebase Project
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Go to <strong>console.firebase.google.com</strong>, create a free project, enable <strong>Firestore Database</strong> + <strong>Anonymous Auth</strong>, and paste your config JSON below so edits sync live across all devices.
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                        Step 2 • Free Web Hosting
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        Host on Vercel or Netlify
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Deploy this `App.jsx` in a free <strong>Vite + React</strong> template on <strong>Vercel.com</strong> or <strong>Netlify.com</strong>. You will immediately get a secure `https://your-app.vercel.app` URL that works as an installable mobile PWA.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                        Step 3 • Google Sites
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        Embed in Google Sites
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Open your <strong>Google Sites</strong> editor, click <strong>Insert → Embed → By URL</strong>, paste your live `https://` link, and choose <strong>Full Page Embed</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Connect Your Own Firebase Cloud Database Form */}
                  <form
                    onSubmit={handleSaveCustomFirebaseConfig}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-emerald-600" />
                        <span>Connect Your Own Firebase Cloud Config (Optional for External Hosting)</span>
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

                  {/* Export & Backup Actions */}
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

                {/* Import JSON Card */}
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
                      Restore & Sync to Cloud
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ==========================================
                ADMIN TAB 1: MANAGE PATHWAYS (CORE & EXTRA)
                ========================================== */}
            {adminTab === 'pathways' && (
              <div className="space-y-6">
                {/* Pathway Selector Bar + "+ Create New Pathway" Button */}
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

                {/* Selected Pathway Metadata Bar */}
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
                  {/* Left Column: Clean Step List (Human-Readable Titles Only) */}
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
                                title="Edit Step"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAdminNode(node.id)}
                                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600"
                                title="Delete Step"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Clean Step Editor Form */}
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

                    {/* Linking Outcomes by Step Title */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="text-xs font-bold text-slate-800">
                        Decision Question & Next Step Links
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

                {/* ==========================================
                    PATHWAY GUIDELINE & NICE REFERENCE LINKS MANAGER
                    ========================================== */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>
                        Bottom Guideline & NICE Reference Links for "{adminPathway.title}" (
                        {(adminPathway.references || []).length})
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      These links appear in a compact collapsible drawer at the bottom of this pathway so they never clutter the emergency view.
                    </p>
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

            {/* ==========================================
                ADMIN TAB 2: MANAGE LEARNING MODULES (SECTIONS, PHOTOS, VIDEOS & QUIZ)
                ========================================== */}
            {adminTab === 'modules' && adminModule && (
              <div className="space-y-6">
                {/* Module Selector Tabs + "+ Create New Module" Button */}
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

                {/* Module Metadata Editor Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-900">
                      Module Overview & Details
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
                </div>

                {/* Sections & Multi-Media Editor Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Sections List + Reorder */}
                  <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3 self-start">
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
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                              <span>{(sec.images || []).length} photos</span>
                              <span>•</span>
                              <span>{(sec.videos || []).length} videos</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveSection(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSection(idx, 1)}
                              disabled={idx === adminModule.sections.length - 1}
                              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => loadSectionIntoForm(sec)}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
                              title="Edit Section"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(sec.id)}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                              title="Delete Section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Rich Section Editor (Text + Multiple Photos + Multiple Videos) */}
                  <form
                    onSubmit={handleSaveSection}
                    className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-5"
                  >
                    <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                      {editingSectionId
                        ? 'Edit Section Content & Media'
                        : 'Add a New Section to Module'}
                    </h3>

                    <div>
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

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Educational Content / Text *
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={sectionForm.body}
                        onChange={(e) =>
                          setSectionForm({ ...sectionForm, body: e.target.value })
                        }
                        placeholder="Write the detailed clinical explanation for this section..."
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Key Clinical Takeaway / Pearl (Optional)
                      </label>
                      <input
                        type="text"
                        value={sectionForm.pearl}
                        onChange={(e) =>
                          setSectionForm({ ...sectionForm, pearl: e.target.value })
                        }
                        placeholder="e.g., Always remove speaking valves before assessing breathing"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900"
                      />
                    </div>

                    {/* Add Multiple Photos / Diagrams to Section */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        <span>Photos & Diagrams in this Section ({sectionForm.images.length})</span>
                      </div>

                      {sectionForm.images.length > 0 && (
                        <div className="space-y-2">
                          {sectionForm.images.map((img, i) => (
                            <div
                              key={img.id || i}
                              className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="truncate">
                                <span className="font-semibold text-slate-800">{img.title}</span>
                                {img.caption && (
                                  <span className="text-slate-500"> — {img.caption}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setSectionForm((prev) => ({
                                    ...prev,
                                    images: prev.images.filter((_, idx) => idx !== i)
                                  }))
                                }
                                className="text-rose-600 hover:underline shrink-0"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newImageDraft.title}
                          onChange={(e) =>
                            setNewImageDraft({ ...newImageDraft, title: e.target.value })
                          }
                          placeholder="Photo / Diagram title"
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                        />
                        <input
                          type="text"
                          value={newImageDraft.url}
                          onChange={(e) =>
                            setNewImageDraft({ ...newImageDraft, url: e.target.value })
                          }
                          placeholder="Image URL (https://...)"
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newImageDraft.caption}
                          onChange={(e) =>
                            setNewImageDraft({ ...newImageDraft, caption: e.target.value })
                          }
                          placeholder="Caption explaining the photo or diagram"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddImageToSectionForm}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold shrink-0"
                        >
                          + Add Photo
                        </button>
                      </div>
                    </div>

                    {/* Add Multiple Videos to Section */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-emerald-600" />
                        <span>Videos in this Section ({sectionForm.videos.length})</span>
                      </div>

                      {sectionForm.videos.length > 0 && (
                        <div className="space-y-2">
                          {sectionForm.videos.map((vid, i) => (
                            <div
                              key={vid.id || i}
                              className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="truncate">
                                <span className="font-semibold text-slate-800">
                                  {vid.title} ({vid.duration})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setSectionForm((prev) => ({
                                    ...prev,
                                    videos: prev.videos.filter((_, idx) => idx !== i)
                                  }))
                                }
                                className="text-rose-600 hover:underline shrink-0"
                              >
                                Remove
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
                          className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                        />
                        <input
                          type="text"
                          value={newVideoDraft.duration}
                          onChange={(e) =>
                            setNewVideoDraft({ ...newVideoDraft, duration: e.target.value })
                          }
                          placeholder="Duration (03:30)"
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                        />
                      </div>
                      <input
                        type="text"
                        value={newVideoDraft.url}
                        onChange={(e) =>
                          setNewVideoDraft({ ...newVideoDraft, url: e.target.value })
                        }
                        placeholder="Video URL / Embed link (https://...)"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newVideoDraft.description}
                          onChange={(e) =>
                            setNewVideoDraft({
                              ...newVideoDraft,
                              description: e.target.value
                            })
                          }
                          placeholder="Short description of what the video demonstrates"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddVideoToSectionForm}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold shrink-0"
                        >
                          + Add Video
                        </button>
                      </div>
                    </div>

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
                        {editingSectionId ? 'Update Section' : 'Save Section to Module'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* End-of-Module Quiz Builder Card */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-emerald-600" />
                        <span>
                          End-of-Module Quiz Questions ({adminModule.quiz.length})
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        These questions stay locked until the user finishes reading the final section of the module.
                      </p>
                    </div>
                  </div>

                  {/* Existing Quiz Questions */}
                  {adminModule.quiz.length > 0 && (
                    <div className="space-y-2.5">
                      {adminModule.quiz.map((qItem, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1 text-xs">
                            <div className="font-bold text-slate-900">
                              {idx + 1}. {qItem.q}
                            </div>
                            <div className="text-emerald-700 font-medium">
                              Correct Answer: {qItem.options[qItem.correct]}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteQuizQuestion(idx)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Quiz Question Form */}
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
                      placeholder="Question text..."
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Correct Option
                        </label>
                        <select
                          value={newQuizDraft.correct}
                          onChange={(e) =>
                            setNewQuizDraft({
                              ...newQuizDraft,
                              correct: Number(e.target.value)
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                        >
                          <option value={0}>Option 1</option>
                          <option value={1}>Option 2</option>
                          <option value={2}>Option 3</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Feedback Explanation (Optional)
                        </label>
                        <input
                          type="text"
                          value={newQuizDraft.explanation}
                          onChange={(e) =>
                            setNewQuizDraft({
                              ...newQuizDraft,
                              explanation: e.target.value
                            })
                          }
                          placeholder="Why is this answer correct?"
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        + Add Question to Quiz
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
          MODAL: CREATE NEW PATHWAY (CORE OR EXTRA)
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

            <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Note: Your new pathway will automatically start with the mandatory clinical governance step ("Confirm Local Guidance & Bedhead Sign").
            </p>

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
                placeholder="What will paramedics learn in this module?"
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
          QUIET SINGLE-LINE CLINICAL GOVERNANCE & LEGAL FOOTER
          ========================================== */}
      <footer className="border-t border-slate-200/80 bg-white py-4 px-4 mt-12">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Clinical reference aid for paramedics ({INITIAL_GOVERNANCE_META.version}) — follow local Ambulance Trust & JRCALC guidelines.
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setLegalModalTab('disclaimer');
                setShowGovernanceModal(true);
              }}
              className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2"
            >
              Clinical Governance
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setLegalModalTab('terms');
                setShowGovernanceModal(true);
              }}
              className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2"
            >
              Terms & Privacy
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setLegalModalTab('mhra');
                setShowGovernanceModal(true);
              }}
              className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2"
            >
              MHRA / SaMD Notice
            </button>
          </div>
        </div>
      </footer>

      {/* ==========================================
          MODAL 1: ROADSIDE TOOLS (SUCTION SIZER OR GO-BAG CHECKLIST)
          ========================================== */}
      {activeToolModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                {activeToolModal === 'calculator' ? (
                  <>
                    <Calculator className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Suction & Tube Sizing Calculator
                    </h3>
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-5 h-5 text-sky-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Emergency Go-Bag Checklist
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

            {activeToolModal === 'calculator' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                    Select Tracheostomy Tube Inner Diameter (ID mm)
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {SUCTION_SIZING_TABLE.map((row) => (
                      <button
                        key={row.id}
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

                {/* Three Clean, Airy Stat Boxes */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-center">
                    <div className="text-[11px] font-semibold text-emerald-800">
                      Suction Catheter
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-emerald-950 mt-1">
                      {currentSizingRow.catFr}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-center">
                    <div className="text-[11px] font-semibold text-sky-800">
                      Max Safe Depth
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-sky-950 mt-1">
                      {currentSizingRow.depthCm}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center">
                    <div className="text-[11px] font-semibold text-amber-800">
                      Downsize Tube
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-amber-950 mt-1">
                      {currentSizingRow.downsize}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Rule of thumb: <strong>Catheter Fr = Tube ID (mm) × 2</strong>. Always verify the child’s exact pre-measured suction depth on their Bedhead Sign.
                </p>
              </div>
            )}

            {activeToolModal === 'checklist' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Tap to check off equipment before transport:</span>
                  <button
                    onClick={() => setBagChecked({})}
                    className="font-semibold text-emerald-700 hover:underline"
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
                        onClick={() =>
                          setBagChecked((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id]
                          }))
                        }
                        className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition ${
                          checked
                            ? 'bg-emerald-50/60 border-emerald-200 text-slate-400'
                            : 'bg-slate-50/70 border-slate-200 text-slate-800 hover:bg-slate-100/70'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                            checked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span
                          className={`text-xs sm:text-sm font-medium ${
                            checked ? 'line-through' : ''
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: FLOWCHART STEP INSPECTOR SLIDE-OVER
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
          MODAL 3: SAVE TO HOME SCREEN (PWA)
          ========================================== */}
      {showPwaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Save to Phone Home Screen
                </h3>
              </div>
              <button
                onClick={() => setShowPwaModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Add <strong>PaedTrach OnCall</strong> to your phone’s home screen for one-tap access and offline availability of all emergency pathways.
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
          MODAL 4: UK CLINICAL GOVERNANCE, TERMS & CONDITIONS, PRIVACY & MHRA REGULATORY HUB
          ========================================== */}
      {showGovernanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 border border-slate-200 shadow-xl space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Legal, Clinical Governance & UK Regulatory Compliance
                </h3>
              </div>
              <button
                onClick={() => setShowGovernanceModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Legal Sub-navigation Tabs */}
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
                Terms & Conditions
              </button>
              <button
                onClick={() => setLegalModalTab('privacy')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  legalModalTab === 'privacy'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                UK GDPR & Privacy
              </button>
            </div>

            {/* Tab Content Area */}
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
                    <strong>1. Scope & Intended Audience:</strong> PaedTrach OnCall is an open-access educational and rapid visual reference tool designed specifically for UK registered paramedics (HCPC), pre-hospital clinicians, and emergency care responders.
                  </p>
                  <p>
                    <strong>2. Primacy of Local Trust & JRCALC Guidelines:</strong> This platform reproduces established national principles from the National Tracheostomy Safety Project (NTSP) and Resuscitation Council UK. It does <strong>not</strong> replace clinical judgement, individualised patient Bedhead Signs, or your employing NHS Ambulance Trust and JRCALC Clinical Practice Guidelines.
                  </p>
                  <p>
                    <strong>3. Medication & Equipment Verification:</strong> It is the sole responsibility of the attending clinician to verify equipment sizing, suction pressures, and drug dosages prior to administration.
                  </p>
                </div>
              )}

              {legalModalTab === 'mhra' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-medium">
                    <strong>UK Medical Devices Regulations 2002 (as amended) & MHRA Guidance Notice:</strong>
                  </div>
                  <p>
                    In accordance with UK Medicines and Healthcare products Regulatory Agency (MHRA) guidance on <em>Software and AI as a Medical Device (SaMD)</em>:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                      <strong>Electronic Reference & Flowchart Visualisation:</strong> Paper or digital flowcharts that digitise published clinical pathways (such as NTSP Green/Red algorithms) where the healthcare professional retains full visibility of every step are classified as clinical reference material rather than a medical device.
                    </li>
                    <li>
                      <strong>Transparent Lookup Table (Suction Sizer):</strong> The Suction & Tube Sizer displays a transparent, standard lookup table (`Catheter Fr = Tube ID mm × 2`) and always instructs clinicians to defer to the patient’s pre-measured Bedhead Sign depth.
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
                    <strong>1. Acceptance of Terms:</strong> By accessing or saving PaedTrach OnCall, you acknowledge that the platform is provided free of charge on an &ldquo;as-is&rdquo; educational basis.
                  </p>
                  <p>
                    <strong>2. Limitation of Liability:</strong> To the fullest extent permitted by UK law, the authors, clinical editors, and contributors accept no liability for any clinical outcome, loss, or damage arising from reliance on the information contained within this application.
                  </p>
                  <p>
                    <strong>3. Intellectual Property & Attribution:</strong> Pathway colour-coding and algorithm structures take inspiration from the open-access safety frameworks published by the National Tracheostomy Safety Project (NTSP) and Resuscitation Council UK. External links to NICE and NHS Trust guidelines remain the property of their respective publishers.
                  </p>
                </div>
              )}

              {legalModalTab === 'privacy' && (
                <div className="space-y-3">
                  <p>
                    <strong>1. Zero Patient Identifiable Data (Caldicott & UK GDPR Compliant):</strong> This application never requests, processes, or stores any patient identifiable information (PII) or clinical incident records.
                  </p>
                  <p>
                    <strong>2. Open Access for Clinicians:</strong> Paramedics and learners do not need to register an account or provide personal data (such as names or emails) to use the On-Call pathways or Learning Modules.
                  </p>
                  <p>
                    <strong>3. Functional Storage Only:</strong> In accordance with the UK Privacy and Electronic Communications Regulations (PECR), this app uses strictly necessary functional storage to cache emergency pathways for offline roadside use and to remember anonymous module completion status on your device. No advertising or third-party tracking cookies are used.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setShowGovernanceModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs sm:text-sm"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}