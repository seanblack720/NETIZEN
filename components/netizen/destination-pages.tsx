import { FeedPage } from "./destinations/feed-page";
import { FundsPage } from "./destinations/funds-page";
import { GroupsPage } from "./destinations/groups-page";
import { JobsPage } from "./destinations/jobs-page";
import { MessagesPage } from "./destinations/messages-page";
import { NotificationsPage } from "./destinations/notifications-page";
import { PetitionsPage } from "./destinations/petitions-page";
import { ProfilePage } from "./destinations/profile-page";
import { SearchPage } from "./destinations/search-page";
import { TaxisPage } from "./destinations/taxis-page";
import { VideosPage } from "./destinations/videos-page";

export {
  FeedPage,
  FundsPage,
  GroupsPage,
  JobsPage,
  MessagesPage,
  NotificationsPage,
  PetitionsPage,
  ProfilePage,
  SearchPage,
  TaxisPage,
  VideosPage,
};

export const destinationPages = {
  videos: VideosPage,
  messages: MessagesPage,
  notifications: NotificationsPage,
  taxis: TaxisPage,
  search: SearchPage,
  funds: FundsPage,
  petitions: PetitionsPage,
  jobs: JobsPage,
  groups: GroupsPage,
  profile: ProfilePage,
} as const;
