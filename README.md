# woiziconsent

A chrome extension that clicks the accept button of a GDPR cookie consent popup.

Usage:

1. clone this repository
2. go to [chrome://extensions/](chrome://extensions/)
3. activate developer mode
4. load unpacked extension
5. select the chrome folder of this repository

Warning:

This extension is fairly stupid. It clicks on buttons labeled "agree" or similar if certain conditions apply. This could not be in your interest!

The conditions for a button to be clicked by this extension are:

-   the button is labeled "agree", or "accept", or similar.
-   the button is located next to a text block containing the word "cookies"

Should a website decide to place a button with a different meening (e.g. "I accept the terms of service" or "I accept the new price for this service") next to a text containing the word "cookies", the button will be clicked regardless.
