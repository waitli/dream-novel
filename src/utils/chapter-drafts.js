const PREFIX = 'novel_draft_v1:'
export function draftKey(projectId, chapterNumber) {
  return PREFIX + encodeURIComponent(projectId) + ':' + chapterNumber
}
export function readChapterDraft(storage, projectId, chapterNumber) {
  const value = storage.getItem(draftKey(projectId, chapterNumber))
  if (!value) return null
  const draft = JSON.parse(value)
  if (draft.version !== 1 || typeof draft.content !== 'string') throw new Error('草稿格式无效，请先备份浏览器数据')
  return draft
}
export function writeChapterDraft(storage, projectId, chapterNumber, content) {
  const draft = { version: 1, content, updatedAt: new Date().toISOString() }
  storage.setItem(draftKey(projectId, chapterNumber), JSON.stringify(draft))
  return draft
}
export function removeChapterDraft(storage, projectId, chapterNumber) {
  storage.removeItem(draftKey(projectId, chapterNumber))
}

