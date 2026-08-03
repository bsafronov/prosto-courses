export interface ChoiceOption {
  id: string;
  text: string;
  feedback: string;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
  feedback: string;
}

export interface OrderingItem {
  id: string;
  text: string;
}

export interface ExactNormalization {
  trim: boolean;
  case: "sensitive" | "insensitive";
}

interface SharedProps {
  prompt: string;
  outcomes: string[];
  explanation: string;
}

export type KnowledgeCheckProps =
  | (SharedProps & {
      type: "single";
      options: ChoiceOption[];
      answer: string;
    })
  | (SharedProps & {
      type: "multiple";
      options: ChoiceOption[];
      answer: string[];
    })
  | (SharedProps & { type: "matching"; pairs: MatchingPair[] })
  | (SharedProps & { type: "ordering"; items: OrderingItem[] })
  | (SharedProps & {
      type: "exact";
      acceptedAnswers: string[];
      normalization: ExactNormalization;
    })
  | (SharedProps & {
      type: "numeric";
      answer: number;
      tolerance: number;
      unit?: string;
    });
