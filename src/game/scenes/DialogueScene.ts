import Phaser from 'phaser';
import { dialogueSequences } from '../../content/dialogue/sequences';
import type { DialogueLine, DialogueChoice } from '../../content/dialogue/types';
import { audio } from '../../services/audio';

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
  private finished = false;

  // UI elements
  private portraitFrame?: Phaser.GameObjects.Rectangle;
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
    this.finished = false;
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const boxHeight = 160;
    const boxY = h - boxHeight;

    // Semi-transparent dialogue box (clickable to advance when not in choice mode)
    const boxBg = this.add.rectangle(w / 2, boxY + boxHeight / 2, w, boxHeight, 0x0d1117, 0.94)
      .setStrokeStyle(2, 0x3b4654)
      .setInteractive({ useHandCursor: true });
    boxBg.on('pointerdown', () => {
      if (!this.choiceMode) {
        audio.unlock();
        this.advance();
      }
    });

    // Subtle portrait frame on the left (only visible when a line has a portrait)
    this.portraitFrame = this.add.rectangle(74, boxY + 80, 112, 134, 0x151d28, 0.96)
      .setStrokeStyle(1, 0x475569)
      .setVisible(false);

    // Speaker name
    this.speakerText = this.add.text(24, boxY + 14, '', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#e3b16b',
    });

    // Body text
    this.bodyText = this.add.text(24, boxY + 44, '', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '15px',
      color: '#f2eee6',
      wordWrap: { width: w - 48, useAdvancedWrap: true },
      lineSpacing: 4,
    });

    // Hint text
    this.add.text(w - 24, boxY + boxHeight - 22, 'Click / E / Space — Continue    Esc — Skip', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '11px',
      color: '#8892a0',
    }).setOrigin(1, 0);

    // Choice container (hidden by default)
    this.choiceContainer = this.add.container(0, 0).setVisible(false);

    // Input
    const onAdvance = () => {
      audio.unlock();
      this.advance();
    };
    const onSkip = () => {
      audio.unlock();
      this.skip();
    };
    const onUp = () => {
      if (this.choiceMode && this.choiceTexts.length > 0) {
        this.choiceIndex = (this.choiceIndex - 1 + this.choiceTexts.length) % this.choiceTexts.length;
        audio.playCue('ui-confirm');
        this.updateChoiceHighlight();
      }
    };
    const onDown = () => {
      if (this.choiceMode && this.choiceTexts.length > 0) {
        this.choiceIndex = (this.choiceIndex + 1) % this.choiceTexts.length;
        audio.playCue('ui-confirm');
        this.updateChoiceHighlight();
      }
    };

    this.input.keyboard!.on('keydown-E', onAdvance);
    this.input.keyboard!.on('keydown-SPACE', onAdvance);
    this.input.keyboard!.on('keydown-ENTER', onAdvance);
    this.input.keyboard!.on('keydown-ESC', onSkip);
    this.input.keyboard!.on('keydown-UP', onUp);
    this.input.keyboard!.on('keydown-DOWN', onDown);

    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown-E', onAdvance);
      this.input.keyboard?.off('keydown-SPACE', onAdvance);
      this.input.keyboard?.off('keydown-ENTER', onAdvance);
      this.input.keyboard?.off('keydown-ESC', onSkip);
      this.input.keyboard?.off('keydown-UP', onUp);
      this.input.keyboard?.off('keydown-DOWN', onDown);
    });

    // Show first line
    this.showLine();
  }

  private clearPortrait() {
    if (this.portraitImage) {
      this.portraitImage.destroy();
      this.portraitImage = undefined;
    }
    this.portraitFrame?.setVisible(false);
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

    // Portrait: render proportionally inside the dedicated left frame so it never
    // stretches or overlaps the speaker name and body text.
    this.clearPortrait();
    if (line.portrait) {
      const portraitKey = `portrait-${line.speaker}`;
      if (this.textures.exists(portraitKey)) {
        const boxY = this.scale.height - 160;
        const maxW = 104;
        const maxH = 126;
        const src = this.textures.get(portraitKey).getSourceImage() as { width: number; height: number };
        const scale = src && src.width > 0 && src.height > 0
          ? Math.min(maxW / src.width, maxH / src.height)
          : 1;
        this.portraitFrame?.setVisible(true);
        this.portraitImage = this.add.image(74, boxY + 80, portraitKey)
          .setOrigin(0.5, 0.5)
          .setDisplaySize(Math.round(src.width * scale), Math.round(src.height * scale));
      }
    }

    // Shift BOTH speaker name and body text right of the portrait frame when shown.
    if (this.portraitImage) {
      const textX = 148;
      this.speakerText.setX(textX);
      this.bodyText.setX(textX);
      this.bodyText.setWordWrapWidth(this.scale.width - textX - 24);
    } else {
      this.speakerText.setX(24);
      this.bodyText.setX(24);
      this.bodyText.setWordWrapWidth(this.scale.width - 48);
    }
  }

  private showChoices(choice: DialogueChoice) {
    this.clearPortrait();
    this.speakerText.setX(24).setText('Choice');
    this.bodyText.setX(24).setWordWrapWidth(this.scale.width - 48).setText(choice.prompt);

    // Clear previous choices
    this.choiceContainer.removeAll(true);
    this.choiceTexts = [];

    const w = this.scale.width;
    const boxY = this.scale.height - 160;
    const startY = boxY + 76;

    choice.options.forEach((opt, i) => {
      const y = startY + i * 28;
      const bg = this.add.rectangle(w / 2, y, w - 80, 24, 0x1e262e, 0.92)
        .setStrokeStyle(1, 0x3b4654)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        this.choiceIndex = i;
        this.updateChoiceHighlight();
      });
      bg.on('pointerdown', () => {
        this.choiceIndex = i;
        this.advance();
      });
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
    audio.playCue('ui-confirm');
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
    audio.playCue('ui-confirm');
    this.finish();
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    this.onComplete(this.sequenceId, this.completionFlag, this.selectedChoiceFlag);
    this.scene.stop();
  }
}