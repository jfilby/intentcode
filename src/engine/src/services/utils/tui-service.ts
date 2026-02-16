import boxen from 'boxen'
import chalk from 'chalk'

export class TuiService {

  renderMessage(text: string) {
    console.log(
      boxen(text, {
        padding: 1,
        margin: 1,
        borderStyle: 'round', // single | double | round | bold
        borderColor: 'cyan',
        width: 80
      })
    )
  }

  renderMessageWithTitle(title: string, text: string) {
    const content = `${chalk.bold(title)}\n\n${text}`

    console.log(
      boxen(content, {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        width: 80
      })
    )
  }
}
