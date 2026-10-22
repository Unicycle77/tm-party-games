/**
 * Sting pictures live on the main-screen PC only, in a subfolder of the music folder apart from the stings themselves.
 * The main screen registers each file's local URL by name when it reads the folder; nothing is uploaded, so other
 * screens never have them.
 */
const urls = new Map<string, string>();

export const registerStingPicture = (name: string, url: string) => { urls.set(name, url); };

/** The local URL of a sting picture, if this screen read it from its folder. */
export const stingPictureUrl = (name: string | undefined) => (name ? urls.get(name) : undefined);
