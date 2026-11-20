import Phaser from 'phaser';
import { dialogueSequences } from '../../content/dialogue/sequences';
import type { DialogueLine, DialogueChoice } from '../../content/dialogue/types';

interface DialogueSceneData {
  sequenceId: string;
  onComplete: (sequenceId: string, completionFlag: string, choiceFlag?: string) => void;
}

/**
 * Renders a dialogue sequence as an overlay scene.
 * Launched by WorldScene when an interaction or trigger fires.
 * Pauses world input while active.
 *
 * Controls:
 *   E / Space  — advance to next line
 *   Esc        — skip entire sequence (sets same completion flag)
 *   Up / Down  — navigate choices when presented
 */
export class DialogueScene extends Phaser.Scene {
  private sequenceId!: string;
  private onComplete!: (sequenceId: string, completionFlag: string, choiceFlag?: string) => void;
  private lines: DialogueLine[] = [];
  private currentLine = 0;
  private completionFlag = '';
  private choiceMode = false;
  private choiceIndex = 0;
  private selectedChoiceFlag?: string;
  private choiceResponseText = '';

  // UI elements
  private portraitImage?: Phaser.GameObjects.Image;
  private speakerText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private choiceContainer!: Phaser.GameObjects.Container;
  private choiceTexts: Phaser.GameObjects.Text[] = [];

  constructor() { super('DialogueScene'); }

  init(data: DialogueSceneData) {
    this.sequenceId = data.sequenceId;
    this.onComplete = data.onComplete;
    const seq = dialogueSequences[data.sequenceId];
    if (!seq) {
      console.error(`Dialogue sequence not found: ${data.sequenceId}`);
      this.onComplete(data.sequenceId, 'missing-sequence');
      this.scene.stop();
      return;
    }
    this.lines = seq.lines;
    this.completionFlag = seq.completionFlag;
    this.currentLine = 0;
    this.choiceMode = false;
    this.choiceIndex = 0;
    this.selectedChoiceFlag = undefined;
    this.choiceResponseText = '';
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const boxHeight = 160;
    const boxY = h - boxHeight;

    // Semi-transparent dialogue box
    this.add.rectangle(w / 2, boxY + boxHeight / 2, w, boxHeight, 0x0d1117, 0.92)
      .setStrokeStyle(2, 0x3b4654);

    // Speaker name
    this.speakerText = this.add.text(24, boxY + 12, '', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#e3b16b',
    });

    // Body text
    this.bodyText = this.add.text(24, boxY + 42, '', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '15px',
      color: '#f2eee6',
      wordWrap: { width: w - 180, useAdvancedWrap: true },
      lineSpacing: 4,
    });

    // Hint text
    this.add.text(w - 24, boxY + boxHeight - 24, 'E / Space — Continue    Esc — Skip', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '11px',
      color: '#8892a0',
    }).setOrigin(1, 0);

    // Choice container (hidden by default)
    this.choiceContainer = this.add.container(0, 0).setVisible(false);

    // Input
    this.input.keyboard!.on('keydown-E', () => this.advance());
    this.input.keyboard!.on('keydown-SPACE', () => this.advance());
    this.input.keyboard!.on('keydown-ESC', () => this.skip());

    // Choice navigation
    this.input.keyboard!.on('keydown-UP', () => {
      if (this.choiceMode && this.choiceTexts.length > 0) {
        this.choiceIndex = (this.choiceIndex - 1 + this.choiceTexts.length) % this.choiceTexts.length;
        this.updateChoiceHighlight();
      }
    });
    this.input.keyboard!.on('keydown-DOWN', () => {
      if (this.choiceMode && this.choiceTexts.length > 0) {
        this.choiceIndex = (this.choiceIndex + 1) % this.choiceTexts.length;
        this.updateChoiceHighlight();
      }
    });

    // Show first line
    this.showLine();
  }

  private showLine() {
    if (this.currentLine >= this.lines.length) {
      this.finish();
      return;
    }

    const line = this.lines[this.currentLine];

    // Check if this line has a choice and we haven't selected one yet
    if (line.choice && !this.choiceMode && !this.selectedChoiceFlag) {
      this.choiceMode = true;
      this.choiceIndex = 0;
      this.showChoices(line.choice);
      return;
    }

    // Clear choice UI if we just selected
    if (this.choiceMode && this.selectedChoiceFlag) {
      this.choiceMode = false;
      this.choiceContainer.setVisible(false);
    }

    // Determine speaker name and text
    const speakerNames: Record<string, string> = {
      k: 'K',
      nero: 'Nero',
      sayu: 'Sayu',
      hachimi: 'Hachimi',
      kingsley: 'Kingsley',
      'news-reporter': 'Reporter',
      'man-1': 'Man 1',
      'man-2': 'Man 2',
      isshin: 'Isshin',
      mai: 'Mai',
      lina: 'Lina',
    };
    const speakerName = speakerNames[line.speaker] || line.speaker;

    // Use choice response if this line had a choice
    let displayText = line.text;
    if (line.choice && this.choiceResponseText) {
      displayText = this.choiceResponseText;
    }

    this.speakerText.setText(speakerName);
    this.bodyText.setText(displayText);

    // Portrait
    if (this.portraitImage) {
      this.portraitImage.destroy();
      this.portraitImage = undefined;
    }
    if (line.portrait) {
      const portraitKey = `portrait-${line.speaker}`;
      if (this.textures.exists(portraitKey)) {
        const boxY = this.scale.height - 160;
        this.portraitImage = this.add.image(80, boxY + 80, portraitKey)
          .setDisplaySize(100, 150)
          .setOrigin(0.5, 0.5);
      }
    }

    // Adjust text position if portrait is shown
    if (this.portraitImage) {
      this.bodyText.setX(160);
      this.bodyText.setWordWrapWidth(this.scale.width - 200);
    } else {
      this.bodyText.setX(24);
      this.bodyText.setWordWrapWidth(this.scale.width - 48);
    }
  }

  private showChoices(choice: DialogueChoice) {
    this.speakerText.setText('Choice');
    this.bodyText.setText(choice.prompt);

    // Clear previous choices
    this.choiceContainer.removeAll(true);
    this.choiceTexts = [];

    const w = this.scale.width;
    const boxY = this.scale.height - 160;
    const startY = boxY + 70;

    choice.options.forEach((opt, i) => {
      const y = startY + i * 28;
      const bg = this.add.rectangle(w / 2, y, w - 80, 24, 0x1e262e, 0.9)
        .setStrokeStyle(1, 0x3b4654);
      const txt = this.add.text(w / 2, y, opt.label, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '14px',
        color: '#c4c9d0',
      }).setOrigin(0.5, 0.5);
      this.choiceContainer.add([bg, txt]);
      this.choiceTexts.push(txt);
    });

    this.choiceContainer.setVisible(true);
    this.updateChoiceHighlight();
  }

  private updateChoiceHighlight() {
    this.choiceTexts.forEach((txt, i) => {
      txt.setColor(i === this.choiceIndex ? '#e3b16b' : '#c4c9d0');
      txt.setFontStyle(i === this.choiceIndex ? 'bold' : 'normal');
    });
  }

  private advance() {
    if (this.choiceMode) {
      // Select the highlighted choice
      const line = this.lines[this.currentLine];
      if (line.choice) {
        const opt = line.choice.options[this.choiceIndex];
        this.selectedChoiceFlag = opt.flag;
        this.choiceResponseText = opt.response;
        this.choiceMode = false;
        this.choiceContainer.setVisible(false);
        // Show the response text on this line, then advance
        this.showLine();
      }
      return;
    }

    this.currentLine++;
    if (this.currentLine >= this.lines.length) {
      this.finish();
    } else {
      this.showLine();
    }
  }

  private skip() {
    this.finish();
  }

  private finish() {
    this.onComplete(this.sequenceId, this.completionFlag, this.selectedChoiceFlag);
    this.scene.stop();
  }

  shutdown() {
    this.input.keyboard?.removeAllListeners();
    this.input.keyboard?.removeAllKeys(true);
  }
}