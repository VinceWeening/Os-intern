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
  entity_type: "user" | "role";
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
      locations: Table<Location>;
      location_memberships: Table<{ user_id: string; location_id: string }>;
      app_roles: Table<AccessRole>;
      access_events: Table<AccessEvent>;
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
