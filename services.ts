import { config } from 'https://deno.land/x/dotenv/mod.ts'

/* env */
const { PROTOCOL, HOST, USERNAME, PASSWORD, TIMELINE, SESSION } = config()

const origin = `${PROTOCOL}${HOST}`
const session = SESSION ?? ''

/* endpoints */
const endpoints = {
  home: `${origin}/xe/`,
  timeline: `${origin}/xe/${TIMELINE}/`,
  index: `${origin}/xe/index.php`,
}

/* utils */
export const createHeader = (props?: Record<string, string>) => ({
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
  Cookie: ['mobile=1', session && `PHPSESSID=${session}`, 'sd=true']
    .filter(Boolean)
    .join('; '),
  Connection: 'keep-alive',
  Host: HOST,
  Referer: endpoints.home,
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Mobile Safari/537.36',
  ...props,
})

/* services */
export const createSession = async () => {
  const res = await fetch(endpoints.home, { headers: createHeader() })
  const session = res.headers.get('Set-Cookie')?.split('; ')[0].split('=')[1]
  if (!session) throw 'failed to parse session'
  return session
}

export const signin = async (session: string) => {
  const form = new FormData()
  form.append('module', 'member')
  form.append('act', 'procMemberLogin')
  form.append('redirect_url', endpoints.home)
  form.append('user_id', USERNAME)
  form.append('password', PASSWORD)

  const res = await fetch(endpoints.home, {
    headers: createHeader(),
    method: 'POST',
    body: form,
  })
  return await res.text()
}

export const fetchTimeline = async (page: number) => {
  const res = await fetch(`${endpoints.home}?mid=${TIMELINE}&page=${page}`, {
    headers: createHeader(),
  })
  const html = await res.text()

  const result = []
  let index = 0

  while (index >= 0) {
    const postSelector = '<div class="xe_content">'
    index = html.indexOf(postSelector, index + 1)

    if (index === -1) break

    const content = html
      .substring(index + postSelector.length, html.indexOf('</div></a>', index))
      .replaceAll('<br />', '\n')

    const idSelector = 'comment_'
    const idIndex = html.indexOf(idSelector, index - 50)
    const id = html.substring(
      idIndex + idSelector.length,
      html.indexOf("')", idIndex)
    )

    result.push({ id, content })
  }

  return result
}

export const postComment = async ({
  postId,
  comment,
}: {
  postId: string
  comment: string
}) => {
  const payload = `<?xml version="1.0" encoding="utf-8" ?>
<methodCall>
<params>
<_filter><![CDATA[insert_comment]]></_filter>
<mid><![CDATA[${TIMELINE}]]></mid>
<document_srl><![CDATA[${postId}]]></document_srl>
<content><![CDATA[${comment}]]></content>
<module><![CDATA[board]]></module>
<act><![CDATA[procBoardInsertComment]]></act>
</params>
</methodCall>`

  await fetch(endpoints.index, {
    method: 'POST',
    headers: createHeader({
      Accept: 'application/xml, text/xml, */*',
      'Content-Type': 'text/plain',
      'X-Requested-With': 'XMLHttpRequest',
    }),
    body: payload,
  })
}
