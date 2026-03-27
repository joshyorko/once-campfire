require "test_helper"

class Message::AttachmentTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper
  include ActionDispatch::TestProcess

  test "creating a message creates image thumbnail" do
    message = create_attachment_message("moon.jpg", "image/jpeg")
    assert message.attachment.representation(:thumb).image.present?
  end

  test "creating a message creates video preview" do
    message = create_attachment_message("alpha-centuri.mov", "video/quicktime")
    assert message.reload.attachment.preview(format: :webp).image.attached?
  end

  test "creating a blank message with attachment will use filename as plain text body" do
    message = create_attachment_message("moon.jpg", "image/jpeg")
    assert_equal message.plain_text_body, "moon.jpg"
  end

  test "creating a message with a direct-uploaded attachment attaches the blob" do
    blob = create_blob("upload.txt", "text/plain", StringIO.new("direct upload"))
    message = rooms(:hq).messages.create_with_attachment!(
      { creator: users(:david), client_message_id: "message" },
      attachment_signed_id: blob.signed_id
    )

    assert_equal blob, message.attachment.blob
    assert_equal "upload.txt", message.plain_text_body
  end


  private
    def create_attachment_message(file, content_type)
      rooms(:hq).messages.create_with_attachment! \
        creator: users(:david),
        client_message_id: "message",
        attachment: fixture_file_upload(file, content_type)
    end

    def create_blob(file, content_type, io = file_fixture(file).open)
      ActiveStorage::Blob.create_and_upload!(
        io: io,
        filename: file,
        content_type: content_type
      )
    end
end
