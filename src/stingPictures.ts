import type { Track } from "./musicFolder";

/**
 * A task's transition files live on the main-screen PC only, in subfolders of the music folder apart from the songs
 * (see transitions.ts). This is what the main screen found there, by file name: the music and the video as handles
 * to read when they play, and each picture as a local URL, ready to show. Nothing is uploaded, so other screens
 * never have them.
 */
let music = new Map<string, Track["handle"]>();
let videos = new Map<string, Track["handle"]>();
let pictures = new Map<string, string>();

/** Replaces what this screen has: the folders were just read. */
export function setTransitionFiles(next: { music: Map<string, Track["handle"]>; videos: Map<string, Track["handle"]>; pictures: Map<string, string> }) {
  for (const url of pictures.values()) URL.revokeObjectURL(url);
  music = next.music; videos = next.videos; pictures = next.pictures;
}

/** The local URL of a transition picture, if this screen read it from its folder. */
export const stingPictureUrl = (name: string | undefined) => (name ? pictures.get(name) : undefined);
export const stingMusic = (title: string | undefined) => (title ? music.get(title) : undefined);
export const stingVideo = (name: string | undefined) => (name ? videos.get(name) : undefined);

/** For the shots: stands in for a picture the main screen read. */
export const registerStingPicture = (name: string, url: string) => { pictures.set(name, url); };
