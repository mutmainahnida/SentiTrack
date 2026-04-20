import { IconType } from "react-icons";
import { CSSProperties } from "react";

interface MaterialIconProps {
  icon: IconType;
  className?: string;
  style?: CSSProperties;
  size?: number;
}

// Icons mapping from Material Icon names
import {
  FaSearch, FaChartLine, FaCheckCircle, FaHistory, FaLightbulb,
  FaBell, FaTimes, FaExclamationCircle, FaEye, FaEyeSlash,
  FaDownload, FaSyncAlt, FaChevronLeft, FaChevronRight, FaUser,
  FaThumbsUp, FaComment, FaRetweet, FaHeart, FaExternalLinkAlt,
  FaChartBar, FaSignOutAlt, FaEye as ViewIcon, FaTimes as TimesIcon,
} from "react-icons/fa";
import { FiTrendingUp } from "react-icons/fi";
import { FiSearch, FiActivity, FiZap, FiAlertCircle, FiX, FiRefreshCw } from "react-icons/fi";

export const ICON_MAP: Record<string, IconType> = {
  // Search & Discovery
  search: FaSearch,
  trending_up: FiTrendingUp,
  menu: FaSearch, // Using FaSearch as placeholder, replace with actual menu icon

  // Analytics & Stats
  monitoring: FaChartLine,
  insights: FaLightbulb,
  analytics: FaChartBar,

  // Verification & Status
  verified: FaCheckCircle,
  check_circle: FaCheckCircle,
  error_outline: FaExclamationCircle,

  // Navigation
  history: FaHistory,
  notifications: FaBell,
  close: FaTimes,

  // Visibility & Actions
  visibility: ViewIcon,
  visibility_off: FaEyeSlash,
  download: FaDownload,
  refresh: FaSyncAlt,
  chevron_left: FaChevronLeft,
  chevron_right: FaChevronRight,

  // User & Auth
  person: FaUser,
  logout: FaSignOutAlt,

  // Social
  thumb_up: FaThumbsUp,
  chat_bubble: FaComment,
  repeat: FaRetweet,
  favorite: FaHeart,
  open_in_new: FaExternalLinkAlt,

  // Landing page extras
  dataset_linked: FaChartBar,
  psychology: FaLightbulb,
  tag: FaExternalLinkAlt,
  link: FaExternalLinkAlt,
  code: FaExternalLinkAlt,

  // Sentiment
  sentiment_satisfied: FaCheckCircle,
  sentiment_neutral: FaChartLine,
  sentiment_dissatisfied: FaExclamationCircle,
};

export default function ReactIcon({ icon: Icon, className = "", style }: MaterialIconProps) {
  return (
    <span style={style} className={className}>
      <Icon />
    </span>
  );
}

// Utility component for icon by name
interface IconByNameProps {
  name: string;
  className?: string;
  style?: CSSProperties;
  size?: number;
}

export function IconByName({ name, className = "", style }: IconByNameProps) {
  const Icon = ICON_MAP[name];
  if (!Icon) {
    console.warn(`Icon "${name}" not found in ICON_MAP`);
    return <FaSearch className={className} style={style} />;
  }
  return <Icon className={className} style={style} />;
}
