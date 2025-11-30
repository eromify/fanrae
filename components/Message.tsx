interface MessageProps {
  message: string
}

const Message = ({ message }: MessageProps) => (
  <section>
    <p>{message}</p>
  </section>
)

export default Message


