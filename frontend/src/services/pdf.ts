import * as pdfjsLib from 'pdfjs-dist'

// 配置PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export interface PDFExtractResult {
  success: boolean
  data?: {
    text: string
    pageCount: number
    fileName: string
  }
  error?: string
}

export type ProgressCallback = (current: number, total: number) => void

/**
 * 从PDF文件提取文本
 * @param file PDF文件对象
 * @param onProgress 进度回调函数
 * @returns 提取结果
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: ProgressCallback
): Promise<PDFExtractResult> {
  try {
    // 将文件转换为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // 加载PDF文档
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise

    const pageCount = pdf.numPages
    let fullText = ''

    // 逐页提取文本
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()

      // 合并文本内容
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')

      fullText += `\n\n===== 第 ${pageNum} 页 =====\n\n${pageText}`

      // 报告进度
      if (onProgress) {
        onProgress(pageNum, pageCount)
      }
    }

    return {
      success: true,
      data: {
        text: fullText.trim(),
        pageCount,
        fileName: file.name
      }
    }
  } catch (error) {
    console.error('PDF文本提取失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF文本提取失败'
    }
  }
}

/**
 * 将文件转换为Base64
 * @param file 文件对象
 * @returns Base64字符串
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
