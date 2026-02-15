export type GroupStatus = "open" | "locked" | "submitted";

export type Database = {
  public: {
    Tables: {
      menu_items: {
        Row: {
          id: string;
          name: string;
          description: string;
          price: number;
          image_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          price: number;
          image_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          price?: number;
          image_url?: string;
          created_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          host_email: string;
          status: GroupStatus;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_email: string;
          status?: GroupStatus;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host_email?: string;
          status?: GroupStatus;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      participants: {
        Row: {
          id: string;
          group_id: string;
          email: string;
          is_host: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          email: string;
          is_host?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          email?: string;
          is_host?: boolean;
          created_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          group_id: string;
          participant_id: string;
          menu_item_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          participant_id: string;
          menu_item_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          participant_id?: string;
          menu_item_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
