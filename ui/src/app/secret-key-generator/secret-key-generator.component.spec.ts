import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecretKeyGeneratorComponent } from './secret-key-generator.component';

describe('SecretKeyGeneratorComponent', () => {
  let component: SecretKeyGeneratorComponent;
  let fixture: ComponentFixture<SecretKeyGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SecretKeyGeneratorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SecretKeyGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
