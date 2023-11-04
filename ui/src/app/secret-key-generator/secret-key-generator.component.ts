import { Component } from '@angular/core';

@Component({
  selector: 'app-secret-key-generator',
  templateUrl: './secret-key-generator.component.html',
  styleUrls: ['./secret-key-generator.component.scss'],
})
export class SecretKeyGeneratorComponent {
  randomString = '';

  constructor() { }

  generateRandomString(): void {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    this.randomString = result;
  }

  copyToClipboard(value: string): void {
    const el = document.createElement('textarea');
    el.value = value;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    const selected = document.getSelection().rangeCount > 0 ? document.getSelection().getRangeAt(0) : false;
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    if (selected) {
      document.getSelection().removeAllRanges();
      document.getSelection().addRange(selected);
    }
  }
}
