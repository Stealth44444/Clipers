import type { ReactNode } from 'react';
import { CircleHelp, EyeOff, Footprints, Shuffle, Smile, Sprout, TrendingUp, Trophy } from 'lucide-react';
import type { ExperienceLevel, OnCamera } from '@clipers/db';

const ICON = { size: 18 };

export const ON_CAMERA_ICONS: Record<OnCamera, ReactNode> = {
  always: <Smile {...ICON} />,
  sometimes: <Shuffle {...ICON} />,
  never: <EyeOff {...ICON} />,
  undecided: <CircleHelp {...ICON} />,
};

export const EXPERIENCE_ICONS: Record<ExperienceLevel, ReactNode> = {
  new: <Sprout {...ICON} />,
  beginner: <Footprints {...ICON} />,
  intermediate: <TrendingUp {...ICON} />,
  pro: <Trophy {...ICON} />,
};
