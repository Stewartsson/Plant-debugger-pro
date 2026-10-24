export interface PumpState {
  tag: string;
  name: string;
  running: boolean;
  rpm: number;
  motor_amps: number;
  vibration_mm_s: number;
  cavitation_index: number;
  is_cavitating: boolean;
  condition: 'NORMAL' | 'WARNING' | 'ALERT' | 'CRITICAL';
}

export interface StrainerState {
  tag: string;
  name: string;
  differential_pressure_psi: number;
  clog_percentage: number;
  has_remote_telemetry: boolean;
  condition: 'NORMAL' | 'WARNING' | 'ALERT' | 'CRITICAL';
}

export interface ValveState {
  tag: string;
  name: string;
  position_pct: number;
  is_remotely_actuated: boolean;
  condition: 'NORMAL' | 'WARNING' | 'ALERT' | 'CRITICAL';
}

export interface FlowTransmitter {
  tag: string;
  name: string;
  flow_gpm: number;
  nominal_flow_gpm: number;
  low_flow_threshold: number;
  condition: 'NORMAL' | 'WARNING' | 'ALERT' | 'CRITICAL';
}

export interface PressureTransmitter {
  tag: string;
  name: string;
  pressure_psi: number;
  nominal_psi: number;
  condition: 'NORMAL' | 'WARNING' | 'ALERT' | 'CRITICAL';
}

export interface TelemetrySnapshot {
  timestamp: string;
  tick: number;
  pump: PumpState;
  strainer: StrainerState;
  bypass_valve: ValveState;
  flow_meter: FlowTransmitter;
  suction_pressure: PressureTransmitter;
  discharge_pressure: PressureTransmitter;
  incident_active: boolean;
  incident_status: 'NORMAL' | 'INVESTIGATING' | 'RECOVERING' | 'RESOLVED';
  sustained_recovery_seconds: number;
  active_alarms: string[];
}

export interface FieldTask {
  task_id: string;
  created_at: string;
  task_type: 'VISUAL_INSPECTION' | 'BOUNDED_ADJUSTMENT' | 'POSITION_VERIFICATION' | 'ACOUSTIC_INSPECTION';
  target_asset: string;
  title: string;
  instruction: string;
  safety_notes: string[];
  allowed_delta_pct?: number | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  evidence_type: 'PHOTO' | 'AUDIO' | 'CONFIRMATION';
  evidence_uri?: string | null;
  evidence_sha256?: string | null;
  ai_interpretation?: Record<string, any> | null;
  operator_notes?: string | null;
  completed_at?: string | null;
}

export interface DecisionTraceItem {
  step: number;
  timestamp: string;
  phase: string;
  title: string;
  details: string;
  status: string;
  task?: FieldTask;
  evidence?: Record<string, any>;
}

export interface SiteKnowledgeFact {
  fact_id: string;
  asset_tag: string;
  assertion: string;
  author: string;
  created_at: string;
  verified: boolean;
  context_tags: string[];
}

export interface SampleAsset {
  id: string;
  name: string;
  filename: string;
  type: string;
  target: string;
  url: string;
}
