import { IntroSpec, QuestionSpec } from 'src/playtest-feedback/lib/shared/series'


/** Ask buttons, top-left. Preview, and the World's owner and deployers. */
export const DEBUG = true

/** Local preview only: the mobile layout on desktop. Ignored once deployed. */
export const PREVIEW_MOBILE = false

/**
 * The game's ask() shows Questions only to players who accepted the intro.
 * Skip or close silences them for the visit.
 */
export const ASK_PARTICIPANTS_ONLY = true

/** Opt-in shown by feedback.intro(). avatar null: no face. */
export const INTRO: IntroSpec | null = {
	title : "Hi, we're the Fastlane team!",
	text  : "We're testing this bowling alley and would love to hear what you think. Your feedback will help us make it better.",
	avatar: null,
}

/** Once live, never change a Question's text under its id: new wording, new id. */
export const QUESTIONS = {
	firstImpressions: {
		text         : "That's great. We'll ask you some questions as you play the game. Are there any first impressions you'd like to report?",
		// Open text. The scale is not shown.
		scale        : 'INTEREST',
		commentPrompt: 'Your first impressions (optional)',
		commentOnly  : true,
	},
	startGame: {
		text         : 'How easy was it to start the game?',
		scale        : 'EASE',
		commentPrompt: 'What made starting easy or hard? (optional)',
	},
	playGame: {
		text         : 'How easy was it to actually play the game?',
		scale        : 'EASE',
		commentPrompt: 'What made playing easy or hard? (optional)',
	},
	anythingWrong: {
		text         : 'Was there anything you found annoying, unusual, or just plain wrong?',
		// Faces are fixed: 1 is sad, 5 is happy. Worst answer sits on the left.
		scale        : ['A great deal', 'A lot', 'Somewhat', 'A little', 'Not at all'],
		commentPrompt: 'What was it? (optional)',
	},
} satisfies Record<string, QuestionSpec>
