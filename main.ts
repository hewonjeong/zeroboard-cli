import { config } from 'https://deno.land/x/dotenv/mod.ts'
import { readLines } from 'https://deno.land/std@v0.51.0/io/bufio.ts'
import { postComment, fetchTimeline } from './services.ts'

/* env */
const { START_PAGE, LAST_PAGE } = config()

/* utils */
const readLine = async () => {
  for await (const line of readLines(Deno.stdin)) {
    return line || ''
  }
}

for (let i = parseInt(START_PAGE); i <= parseInt(LAST_PAGE); i++) {
  console.log('Current page:', i)
  const posts = await fetchTimeline(i)
  for (let j = 0; j < posts.length; j++) {
    console.log(posts[j].content)
    const comment = await readLine()
    if (comment) {
      postComment({ postId: posts[j].id, comment })
    }
  }
}
