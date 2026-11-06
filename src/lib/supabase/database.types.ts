import type { DailySummary, DailyInput, Feedback } from "@/lib/daily/model";
import type { FormVersion, FormDefinition } from "@/lib/cash/form-definition";
// Phase 1 contract. Regenerate with `npm run db:types` against local Supabase
// after future migrations. Never derive app roles from editable user metadata.
import type { AccessRole } from "@/lib/auth/permissions";
import type { CashClosing, CashEvent, CashPayload } from "@/lib/cash/model";
export type CashSnapshot = {
  closing: CashClosing;
  counts: Record<string, number>;
};
type Table<Row> = { Row: Row; Insert: never; Update: never; Relationships: [] };
export type Profile = {
  id: string;
  full_name: string;
  role: "employee" | "manager";
  active: boolean;
  created_at: string;
  access_role_id: string;
  management_version: number;
  default_location_id: string | null;
};
// One submitted or reviewed closing as returned by cash_report.
export type ReportRow = {
  id: string;
  location_id: string;
  location_name: string;
  work_date: string;
  employee_name: string;
  status: "submitted" | "reviewed";
  turnover_cents: number;
  sold_vouchers_cents: number;
  ideal_cents: number;
  pax_cents: number;
  paynl_cents: number;
  shop_vouchers_cents: number;
  redeemed_vouchers_cents: number;
  counted_cents: number;
  opening_cents: number;
  cash_cents: number;
  result_cents: number;
  register_cents: number;
};
export type Location = {
  id: string;
  name: string;
  slug: string;
  default_opening_cents?: number;
  cash_form_id?: string | null;
};
export type PermissionGrant = {
  user_id: string;
  permission: string;
  expires_at: string | null;
};
export type ManagedUser = {
  id: string;
  email: string;
  full_name: string;
  access_role_id: string | null;
  active: boolean;
  management_version: number;
  location_ids: string[];
  has_profile: boolean;
};
export type AccessEvent = {
  id: string;
  actor_id: string;
  occurred_at: string;
  entity_type: "user" | "role" | "form";
  entity_id: string;
  reason: string;
  before_values: unknown;
  after_values: unknown;
};
export type Database = {
  public: {
    Tables: {
      profiles: Omit<Table<Profile>, "Relationships"> & {
        Relationships: [
          {
            foreignKeyName: "profiles_access_role_id_fkey";
            columns: ["access_role_id"];
            isOneToOne: false;
            referencedRelation: "app_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_form_versions: Table<FormVersion>;
      daily_summaries: Table<DailySummary>;
      feedback: Table<Feedback>;
      locations: Table<Location>;
      location_memberships: Table<{ user_id: string; location_id: string }>;
      app_roles: Table<AccessRole>;
      access_events: Table<AccessEvent>;
      user_permission_grants: Table<PermissionGrant>;
      cash_closings: Table<CashClosing>;
      cash_count_lines: Table<{
        closing_id: string;
        denomination_cents: number;
        quantity: number;
        subtotal_cents: number;
      }>;
      closing_events: Table<CashEvent>;
    };
    Views: Record<string, never>;
    Functions: {
      send_feedback: {
        Args: {
          p_id: string;
          p_location: string | null;
          p_kind: string;
          p_title: string;
          p_description: string;
        };
        Returns: string;
      };
      update_feedback: {
        Args: { p_id: string; p_version: number; p_status: string };
        Returns: undefined;
      };
      save_daily_summary: {
        Args: {
          p_location: string;
          p_date: string;
          p_version: number;
          p_payload: DailyInput;
        };
        Returns: DailySummary;
      };
      save_cash_closing: {
        Args: {
          p_id: string;
          p_expected_version: number;
          p_payload: CashPayload;
          p_submit: boolean;
          p_submission_key: string | null;
        };
        Returns: CashSnapshot;
      };
      transition_cash_closing: {
        Args: {
          p_id: string;
          p_expected_version: number;
          p_action: string;
          p_reason: string | null;
        };
        Returns: CashSnapshot;
      };
      admin_save_user_grants: {
        Args: {
          p_user_id: string;
          p_grants: { permission: string; expires_at: string | null }[];
          p_expected_version: number;
          p_reason: string;
        };
        Returns: undefined;
      };
      admin_publish_cash_form: {
        Args: {
          p_location_id: string;
          p_definition: FormDefinition;
          p_expected_id: string | null;
          p_reason: string;
        };
        Returns: string;
      };
      admin_list_users: { Args: Record<string, never>; Returns: ManagedUser[] };
      admin_save_user: {
        Args: {
          p_id: string;
          p_name: string;
          p_role_id: string;
          p_active: boolean;
          p_location_ids: string[];
          p_expected_version: number;
          p_reason: string;
        };
        Returns: undefined;
      };
      admin_save_role: {
        Args: {
          p_id: string | null;
          p_name: string;
          p_description: string;
          p_is_admin: boolean;
          p_all_locations: boolean;
          p_permissions: string[];
          p_expected_version: number;
          p_reason: string;
        };
        Returns: string;
      };
      set_default_location: {
        Args: { p_location: string | null };
        Returns: undefined;
      };
      cash_staff: {
        Args: { p_location: string };
        Returns: { id: string; full_name: string }[];
      };
      cash_report: {
        Args: { p_from: string; p_to: string };
        Returns: ReportRow[];
      };
    };
    Enums: {
      staff_role: Profile["role"];
      closing_status: "draft" | "submitted" | "reviewed";
    };
    CompositeTypes: Record<string, never>;
  };
};
