export interface SelectedImage {
  element: HTMLImageElement;
  rect: DOMRect;
  borderRadius: string;
}

export interface OverlayState {
  selectedImage: SelectedImage | null;
  sidebarVisible: boolean;
  chatBarVisible: boolean;
  isProcessing: boolean;
  currentAction: string | null;
}

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  category?: string;
}

export interface SidebarProps {
  visible: boolean;
  selectedImage: SelectedImage | null;
  onActionClick: (action: QuickAction) => void;
  onClose: () => void;
  isProcessing?: boolean;
  currentAction?: string | null;
}

export interface ChatBarProps {
  visible: boolean;
  selectedImage: SelectedImage | null;
  onSubmit: (message: string) => void;
  onClose: () => void;
  isProcessing?: boolean;
  placeholder?: string;
}