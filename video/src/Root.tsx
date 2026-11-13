import { Composition } from "remotion";
import { ClubOSDemo, DURATION } from "./ClubOSDemo";

export const Root = () => (
  <Composition id="ClubOSDemo" component={ClubOSDemo} durationInFrames={DURATION} fps={30} width={1920} height={1080} />
);
