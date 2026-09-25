// Homepage motion and graphics. The page reads completely without any of this.
import { finishCompile } from './paper/compile.js'
import { mountInk } from './paper/ink.js'
import { mountPeel } from './paper/peel.js'
import { mountPreviews } from './paper/previews.js'
import { mountPrism } from './paper/prism.js'
import { mountReplay } from './paper/replay.js'

finishCompile()
mountPrism(document.querySelector('.prism-slot'))
mountReplay(document.querySelector('#learning-to-read-out .research-preview'))
mountPreviews()
mountPeel()
// Ink is positioned against laid-out text, so wait for the web fonts
document.fonts.ready.then(mountInk)
