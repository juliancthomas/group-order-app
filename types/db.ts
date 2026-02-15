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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "participants_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "cart_items_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
