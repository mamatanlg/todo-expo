export type Database = {
  public: {
    Tables: {
      'todo-opxe': {
        Row: {
          id: number;
          created_at: string;
          title: string | null;
          description: string | null;
          status: string | null;
          author: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          title?: string | null;
          description?: string | null;
          status?: string | null;
          author?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          title?: string | null;
          description?: string | null;
          status?: string | null;
          author?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
