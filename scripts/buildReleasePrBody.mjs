// Pure rendering and injection for the staging→main release PR body's
// managed block. Delimiter constants live here because the marker-counting
// logic in injectIntoBody is their primary consumer; U2's sanitizeTitle
// imports them to strip literal occurrences out of attacker-controllable
// PR titles.
//
// The full renderReleaseBody / injectIntoBody implementation lands in U3.

export const DELIMITER_START = '<!-- release-pr:start -->';
export const DELIMITER_END = '<!-- release-pr:end -->';
