import { DirectUpload } from "@rails/activestorage"

export default class FileUploader {
  constructor(file, url, directUploadUrl, clientMessageId, progressCallback) {
    this.file = file
    this.url = url
    this.directUploadUrl = directUploadUrl
    this.clientMessageId = clientMessageId
    this.progressCallback = progressCallback
  }

  async upload() {
    const attachmentSignedId = await this.#uploadDirectly()
    return this.#createMessage(attachmentSignedId)
  }

  #uploadDirectly() {
    const upload = new DirectUpload(this.file, this.directUploadUrl, {
      directUploadWillStoreFileWithXHR: (request) => {
        request.upload.addEventListener("progress", this.#uploadProgress.bind(this))
      }
    })

    return new Promise((resolve, reject) => {
      upload.create((error, attributes) => {
        if (error) {
          reject(error)
        } else {
          resolve(attributes.signed_id)
        }
      })
    })
  }

  #createMessage(attachmentSignedId) {
    const formdata = new FormData()
    formdata.append("message[attachment_signed_id]", attachmentSignedId)
    formdata.append("message[client_message_id]", this.clientMessageId)

    const req = new XMLHttpRequest()
    req.open("POST", this.url)
    req.setRequestHeader("X-CSRF-Token", document.querySelector("meta[name=csrf-token]").content)

    const result = new Promise((resolve, reject) => {
      req.addEventListener("readystatechange", () => {
        if (req.readyState === XMLHttpRequest.DONE) {
          if (req.status < 400) {
            resolve(req.response)
          } else {
            reject()
          }
        }
      })

      req.addEventListener("error", reject)
      req.addEventListener("abort", reject)
      req.addEventListener("timeout", reject)
    })

    req.send(formdata)
    return result
  }

  #uploadProgress(event) {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 100)
      this.progressCallback(percent, this.clientMessageId, this.file)
    }
  }
}
