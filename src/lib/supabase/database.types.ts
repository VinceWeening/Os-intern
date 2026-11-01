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
      profiles: Table<Profile>;
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
    };
    Enums: {
      staff_role: Profile["role"];
      closing_status: "draft" | "submitted" | "reviewed";
    };
    CompositeTypes: Record<string, never>;
  };
};
