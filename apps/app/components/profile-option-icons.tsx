import type { ReactNode } from 'react';
import { EyeSlashIcon, FootprintsIcon, PlantIcon, QuestionIcon, ShuffleIcon, TrendUpIcon, TrophyIcon, UserFocusIcon } from '@phosphor-icons/react/ssr';
import type { ExperienceLevel, OnCamera } from '@clipers/db';

const ICON = { size: 18 };

export const ON_CAMERA_ICONS: Record<OnCamera, ReactNode> = {
  always: <UserFocusIcon {...ICON} />,
  sometimes: <ShuffleIcon {...ICON} />,
  never: <EyeSlashIcon {...ICON} />,
  undecided: <QuestionIcon {...ICON} />,
};

export const EXPERIENCE_ICONS: Record<ExperienceLevel, ReactNode> = {
  new: <PlantIcon {...ICON} />,
  beginner: <FootprintsIcon {...ICON} />,
  intermediate: <TrendUpIcon {...ICON} />,
  pro: <TrophyIcon {...ICON} />,
};
