import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RepuestosListComponent } from './repuestos-list';
import { RepuestosService } from './repuestos.service';
import { Repuesto } from './repuesto.model';

describe('Stock editor from lower table rows', () => {
  let fixture: ComponentFixture<RepuestosListComponent>;
  const addStock = vi.fn();
  const minimum = vi.fn();
  const scrollIntoView = vi.fn();
  const rows: Repuesto[] = Array.from({ length: 12 }, (_, index) => ({
    id: 100 + index * 7,
    nombre: `Repuesto ${index + 1}`,
    maquina_id: 1,
    maquina_nombre: 'Prensa',
    descripcion: null,
    observaciones: null,
    foto: null,
    prioritario: null,
    cantidad_actual: 10,
    cantidad_minima: 2,
  }));
  let previousScroll: PropertyDescriptor | undefined;
  beforeEach(async () => {
    addStock.mockReset();
    minimum.mockReset();
    scrollIntoView.mockReset();
    previousScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    TestBed.configureTestingModule({
      imports: [RepuestosListComponent],
      providers: [
        provideRouter([]),
        {
          provide: RepuestosService,
          useValue: { list: () => of(rows), addStock, minimum },
        },
      ],
    });
    fixture = TestBed.createComponent(RepuestosListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });
  afterEach(() => {
    if (previousScroll)
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', previousScroll);
    else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    vi.restoreAllMocks();
  });
  async function open(rowIndex: number, label = 'Ingresar stock'): Promise<HTMLInputElement> {
    const row = fixture.nativeElement.querySelectorAll('tbody tr')[rowIndex] as HTMLElement;
    const button = Array.from(row.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === label,
    )!;
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('#quantity') as HTMLInputElement;
  }
  for (const index of [2, 11]) {
    it(`reveals the editor for row ${index + 1} and saves to that part ID`, async () => {
      const input = await open(index);
      expect(fixture.nativeElement.querySelector('form h2').textContent).toContain(
        rows[index].nombre,
      );
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
      expect(document.activeElement).toBe(input);
      input.value = '3';
      input.dispatchEvent(new Event('input'));
      addStock.mockReturnValue(of({ ...rows[index], cantidad_actual: 13 }));
      fixture.nativeElement
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(addStock).toHaveBeenCalledExactlyOnceWith(rows[index].id, 3);
      expect(fixture.nativeElement.querySelector('#quantity')).toBeNull();
      expect(fixture.componentInstance.parts()[index].cantidad_actual).toBe(13);
      expect(fixture.componentInstance.parts()[0].cantidad_actual).toBe(10);
    });
  }
  it('reveals and resets the existing editor when switching between parts and minimum mode', async () => {
    await open(0);
    fixture.componentInstance.stockForm.controls.cantidad.setValue(7);
    scrollIntoView.mockClear();
    const input = await open(11, 'Mínimo');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('2');
    expect(fixture.componentInstance.selected()?.id).toBe(rows[11].id);
    expect(fixture.nativeElement.querySelector('form h2').textContent).toContain(
      'Editar stock mínimo',
    );
    minimum.mockReturnValue(of({ ...rows[11], cantidad_minima: 4 }));
    input.value = '4';
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(minimum).toHaveBeenCalledExactlyOnceWith(rows[11].id, 4);
    expect(addStock).not.toHaveBeenCalled();
  });
});
