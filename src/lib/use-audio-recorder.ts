import { useState, useRef, useCallback } from 'react'

export type RecordingState = 'idle' | 'recording'

export function useAudioRecorder() {
  const [state, setState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'
    const recorder = new MediaRecorder(stream, { mimeType })
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.start(100)
    mediaRecorderRef.current = recorder
    startTimeRef.current = Date.now()
    setState('recording')
    setDuration(0)

    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }, [])

  const stop = useCallback((): Promise<{ blob: Blob; duration: number }> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve({ blob: new Blob(), duration: 0 })
        return
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000)
        recorder.stream.getTracks().forEach((t) => t.stop())
        if (timerRef.current) clearInterval(timerRef.current)
        setState('idle')
        setDuration(0)
        resolve({ blob, duration: finalDuration })
      }

      recorder.stop()
    })
  }, [])

  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null
      recorder.stop()
      recorder.stream.getTracks().forEach((t) => t.stop())
    }
    if (timerRef.current) clearInterval(timerRef.current)
    chunksRef.current = []
    setState('idle')
    setDuration(0)
  }, [])

  return { state, duration, start, stop, cancel }
}
