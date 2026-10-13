(() => {
  const scene = document.querySelector('a-scene');
  const element = (selector) => document.querySelector(selector);
  const mainControl = element('[data-control="main"]');
  const dayToggle = element('[data-control="day-toggle"]');
  const dayStep = element('[data-control="day-step"]');
  const resetControl = element('[data-control="reset"]');
  const controls = [mainControl, dayToggle, dayStep, resetControl];
  const stageTitle = element('#stage-title');
  const stageCopy = element('#stage-copy');
  const stageCount = element('#stage-count');
  const mainLabel = element('#main-label');
  const dayToggleLabel = element('#day-toggle-label');
  const scienceNote = element('#science-note');
  const skewer = element('#skewer');
  const seedCoating = element('#seed-coating');
  const crystalGrowth = element('#crystal-growth');
  const measuredWater = element('#measured-water');
  const potWater = element('#pot-water');
  const potWaterNeck = element('#pot-water-neck');
  const glassSolution = element('#glass-solution');
  const sugarPile = element('#sugar-pile');
  const dayCounter = element('#day-counter');
  const heatFlame = element('#heat-flame');
  const boilingBubbles = element('#boiling-bubbles');
  const temperatureReadout = element('#temperature-readout');
  const glassLid = element('#glass-lid');
  const clip = element('#clip');
  const interactionCursor = element('#interaction-cursor');
  const cursorReticle = element('#cursor-reticle');
  const controller = element('#right-controller');
  const scaleReadout = element('#scale-readout');
  const doseGroup = element('#sugar-doses');

  const stageDetails = {
    1: ['Prepara la brocheta', 'Primero humedece la madera; después cúbrela con azúcar granulada. Los granos adheridos servirán como semillas.', 'Las semillas ofrecen superficies para que las moléculas de sacarosa se ordenen y formen cristales.'],
    2: ['Mide el agua', 'Coloca exactamente 100 g de agua en la balanza y pásalos al recipiente de calentamiento.', 'La masa de agua determina cuánto azúcar podrá disolverse al calentar.'],
    3: ['Calienta hasta hervir', 'Enciende el calentador y espera a que el agua llegue al punto de ebullición.', 'Al aumentar la temperatura, aumenta mucho la solubilidad de la sacarosa.'],
    4: ['Disuelve el azúcar', 'Añade 280 g de azúcar poco a poco. Incorpora una dosis cada vez y deja que se disuelva.', 'La mezcla caliente queda concentrada; al enfriarse puede volverse sobresaturada.'],
    5: ['Enfría la disolución', 'Apaga el calentador y espera a que el jarabe se enfríe antes de transferirlo.', 'Al bajar la temperatura, la disolución puede contener más azúcar de la que admite en equilibrio.'],
    6: ['Prepara el vaso', 'Vierte con cuidado la disolución enfriada en el vaso transparente.', 'El vaso deja observar la solución y el crecimiento sin mover las semillas.'],
    7: ['Coloca la brocheta', 'Introduce la brocheta azucarada y sujétala con la pinza. Déjala centrada, sin tocar el fondo ni las paredes.', 'La brocheta queda suspendida para que el cristal crezca alrededor y en todas direcciones.'],
    8: ['Cubre y deja cristalizar', 'Coloca la tapa. Inicia el paso del tiempo o avanza día por día hasta completar siete días.', 'La evaporación lenta y el enfriamiento permiten que la sacarosa se deposite sobre las semillas.'],
    9: ['Extrae la piruleta', 'Han pasado siete días. Extrae la brocheta y observa la capa de cristales de azúcar.', 'Las moléculas de sacarosa forman una red sólida ordenada alrededor de la madera.']
  };

  let stage = 1;
  let substep = 0;
  let sugarAdded = 0;
  let day = 0;
  let isRunning = false;
  let extracted = false;
  let pendingTimer = null;
  let prepTimer = null;
  let doseTimer = null;
  let prepAnimationTimers = [];
  let dayTimer = null;

  function setButton(control, visible, enabled = true) {
    control.setAttribute('visible', visible);
    const surface = control.querySelector('.control-surface');
    surface.classList.toggle('hit', visible && enabled);
    surface.setAttribute('color', enabled ? '#438f80' : '#52625a');
  }

  function getMainLabel() {
    if (stage === 1) return substep === 0 ? 'MOJAR BROCHETA' : 'CUBRIR CON AZÚCAR';
    if (stage === 2) return substep === 0 ? 'PESAR 100 g' : 'VERTER AGUA';
    if (stage === 3) return pendingTimer ? 'HIRVIENDO…' : 'ENCENDER';
    if (stage === 4) return doseTimer ? 'DISOLVIENDO…' : `AÑADIR 70 g  (${sugarAdded}/280)`;
    if (stage === 5) return pendingTimer ? 'ENFRIANDO…' : 'EMPEZAR A ENFRIAR';
    if (stage === 6) return 'VERTER EN EL VASO';
    if (stage === 7) return substep === 0 ? 'INTRODUCIR BROCHETA' : 'SUJETAR CON PINZA';
    if (stage === 8) return 'COLOCAR LA TAPA';
    return extracted ? 'EXPERIMENTO COMPLETO' : 'EXTRAER BROCHETA';
  }

  function updateControls() {
    const inDays = stage === 8 && substep === 1;
    const canAct = !(stage === 3 && pendingTimer) && !(stage === 5 && pendingTimer) && !prepTimer && !doseTimer;
    const mainVisible = !inDays && !(stage === 9 && extracted);
    mainLabel.setAttribute('value', getMainLabel());
    setButton(mainControl, mainVisible, canAct);
    setButton(dayToggle, inDays && day < 7, day < 7);
    dayToggleLabel.setAttribute('value', isRunning ? 'PAUSAR' : 'INICIAR');
    setButton(dayStep, inDays && day < 7 && !isRunning, day < 7 && !isRunning);
    setButton(resetControl, true, true);
  }

  function renderStage(copyOverride) {
    const detail = stageDetails[stage];
    stageTitle.setAttribute('value', `${stage} / 9  ·  ${detail[0]}`);
    stageCopy.setAttribute('value', copyOverride || detail[1]);
    const count = stage === 8 && substep === 1
      ? `CRISTALIZACIÓN  ·  DÍA ${day} DE 7`
      : stage === 4
        ? `AZÚCAR AÑADIDA  ·  ${sugarAdded} / 280 g`
        : `PASO ${stage} DE 9`;
    stageCount.setAttribute('value', count);
    scienceNote.setAttribute('value', `CIENCIA  ·  ${detail[2]}`);
    updateControls();
  }

  function move(entity, position, duration = 500) {
    entity.removeAttribute('animation__move');
    entity.setAttribute('animation__move', `property: position; to: ${position}; dur: ${duration}; easing: easeInOutSine`);
  }

  function finishStage(nextStage) {
    stage = nextStage;
    substep = 0;
    renderStage();
  }

  function addSugarDose() {
    sugarAdded += 70;
    const amount = Math.max(0.08, (280 - sugarAdded) / 280);
    sugarPile.setAttribute('scale', `1 ${amount} 1`);

    for (let index = 0; index < 8; index += 1) {
      const grain = document.createElement('a-sphere');
      const x = -0.35 + (index % 4) * 0.18;
      const z = -4.48 + Math.floor(index / 4) * 0.12;
      grain.setAttribute('radius', '0.035');
      grain.setAttribute('color', '#fffdf4');
      grain.setAttribute('position', `${x} 2.05 ${z}`);
      grain.setAttribute('animation__fall', `property: position; to: ${x} 1.12 ${z}; dur: 650; delay: ${index * 35}; easing: easeInQuad`);
      grain.setAttribute('animation__fade', 'property: scale; to: 0.01 0.01 0.01; dur: 400; delay: 700; easing: easeInQuad');
      doseGroup.appendChild(grain);
      setTimeout(() => grain.remove(), 1250);
    }

    potWater.setAttribute('color', sugarAdded === 280 ? '#e0bd72' : '#8ac7be');
    renderStage(`Añadidos ${sugarAdded} de 280 g. Espera a que esta dosis se disuelva antes de continuar.`);
    doseTimer = setTimeout(() => {
      doseTimer = null;
      if (sugarAdded === 280) finishStage(5);
      else renderStage(`La dosis está disuelta. Añade los siguientes 70 g.`);
    }, 800);
    updateControls();
  }

  function startCooling() {
    heatFlame.setAttribute('visible', false);
    boilingBubbles.setAttribute('visible', false);
    temperatureReadout.setAttribute('value', '100 °C');
    let seconds = 5;
    renderStage(`El recipiente se está enfriando. Espera ${seconds} s antes de continuar.`);
    const tick = () => {
      seconds -= 1;
      temperatureReadout.setAttribute('value', `${Math.round(20 + 16 * seconds)} °C`);
      if (seconds <= 0) {
        clearInterval(pendingTimer);
        pendingTimer = null;
        temperatureReadout.setAttribute('value', '20 °C');
        finishStage(6);
        return;
      }
      renderStage(`El recipiente se está enfriando. Espera ${seconds} s antes de continuar.`);
    };
    pendingTimer = setInterval(tick, 1000);
    updateControls();
  }

  function addCrystalsForDay(dayNumber) {
    const crystalCount = dayNumber === 7 ? 16 : 8;
    for (let index = 0; index < crystalCount; index += 1) {
      const seed = dayNumber * 101 + index * 37;
      const angle = seed * 2.399;
      const vertical = 0.12 + ((index * 3 + dayNumber * 2) % 13) * 0.068;
      const radius = 0.035 + ((index + dayNumber) % 4) * 0.018;
      const size = 0.024 + ((index * 5 + dayNumber) % 4) * 0.012;
      const crystal = document.createElement('a-entity');
      crystal.setAttribute('geometry', `primitive: octahedron; radius: ${size}`);
      crystal.setAttribute('mixin', 'sugar-crystal');
      crystal.setAttribute('position', `${Math.cos(angle) * radius} ${vertical} ${Math.sin(angle) * radius}`);
      crystal.setAttribute('rotation', `${seed % 50} ${(seed * 3) % 90} ${(seed * 7) % 70}`);
      crystal.setAttribute('scale', '0.001 0.001 0.001');
      crystal.setAttribute('animation', `property: scale; from: 0.001 0.001 0.001; to: 1 1 1; dur: 600; delay: ${index * 45}; easing: easeOutBack`);
      crystalGrowth.appendChild(crystal);
    }
  }

  function stopDayTimer() {
    if (dayTimer) clearInterval(dayTimer);
    dayTimer = null;
    isRunning = false;
  }

  function advanceDay() {
    if (day >= 7 || stage !== 8) return;
    day += 1;
    addCrystalsForDay(day);
    dayCounter.setAttribute('value', `DÍA ${day} / 7`);
    stageCount.setAttribute('value', `CRISTALIZACIÓN  ·  DÍA ${day} DE 7`);
    stageCopy.setAttribute('value', `Día ${day} de 7: los cristales de sacarosa crecen alrededor de la brocheta.`);
    if (day === 7) {
      stopDayTimer();
      stage = 9;
      substep = 0;
      renderStage('Se completaron siete días de crecimiento. Extrae la brocheta para observar los cristales.');
      return;
    }
    updateControls();
  }

  function toggleDays() {
    if (isRunning) {
      stopDayTimer();
    } else if (day < 7) {
      isRunning = true;
      dayTimer = setInterval(advanceDay, 1500);
    }
    updateControls();
  }

  function extractSkewer() {
    extracted = true;
    glassLid.setAttribute('visible', false);
    clip.setAttribute('visible', false);
    move(skewer, '-0.15 0.82 -3.52', 900);
    stageTitle.setAttribute('value', '9 / 9  ·  Piruleta de cristales');
    stageCopy.setAttribute('value', 'La brocheta está cubierta por cristales de azúcar. Compara su forma y distribución con las semillas iniciales.');
    stageCount.setAttribute('value', 'RESULTADO  ·  7 DÍAS COMPLETADOS');
    scienceNote.setAttribute('value', 'CIENCIA  ·  La sacarosa sólida forma caras cristalinas al ordenarse desde una disolución sobresaturada.');
    updateControls();
  }

  function performMainAction() {
    if (stage === 1 && substep === 0) {
      skewer.setAttribute('rotation', '0 0 0');
      move(skewer, '0.5 0.82 -3.26', 300);
      prepAnimationTimers.push(setTimeout(() => move(skewer, '0.5 0.52 -3.26', 350), 320));
      prepAnimationTimers.push(setTimeout(() => move(skewer, '0.5 0.82 -3.26', 350), 760));
      substep = 1;
      prepTimer = setTimeout(() => {
        prepTimer = null;
        updateControls();
      }, 1200);
      renderStage('Brocheta humedecida. Ahora cúbrela con azúcar granulada para dejar semillas adheridas.');
      return;
    }
    if (stage === 1 && substep === 1) {
      seedCoating.setAttribute('visible', true);
      skewer.setAttribute('rotation', '0 0 90');
      move(skewer, '1.45 0.82 -3.2', 550);
      finishStage(2);
      return;
    }
    if (stage === 2 && substep === 0) {
      measuredWater.setAttribute('visible', true);
      scaleReadout.setAttribute('value', '100 g');
      substep = 1;
      renderStage('La balanza marca 100 g de agua. Ahora viértela en el recipiente de calentamiento.');
      return;
    }
    if (stage === 2 && substep === 1) {
      measuredWater.setAttribute('visible', false);
      potWater.setAttribute('visible', true);
      potWaterNeck.setAttribute('visible', true);
      finishStage(3);
      return;
    }
    if (stage === 3) {
      heatFlame.setAttribute('visible', true);
      boilingBubbles.setAttribute('visible', true);
      temperatureReadout.setAttribute('value', 'CALENTANDO');
      pendingTimer = setTimeout(() => {
        pendingTimer = null;
        temperatureReadout.setAttribute('value', '100 °C');
        finishStage(4);
      }, 2600);
      renderStage('Calentando… espera a que aparezcan burbujas de ebullición para añadir el azúcar.');
      return;
    }
    if (stage === 4) {
      addSugarDose();
      return;
    }
    if (stage === 5) {
      startCooling();
      return;
    }
    if (stage === 6) {
      potWater.setAttribute('visible', false);
      potWaterNeck.setAttribute('visible', false);
      glassSolution.setAttribute('visible', true);
      finishStage(7);
      return;
    }
    if (stage === 7 && substep === 0) {
      move(skewer, '0.85 0.82 -4.35', 700);
      skewer.setAttribute('rotation', '0 0 0');
      substep = 1;
      renderStage('Brocheta dentro del vaso. Ajusta la pinza para mantenerla suspendida y centrada.');
      return;
    }
    if (stage === 7 && substep === 1) {
      clip.setAttribute('visible', true);
      glassLid.setAttribute('visible', true);
      glassLid.setAttribute('position', '0.85 2.45 -4.35');
      dayCounter.setAttribute('visible', true);
      dayCounter.setAttribute('value', 'DÍA 0 / 7');
      stage = 8;
      substep = 0;
      renderStage('Brocheta centrada y fija. Coloca la tapa para empezar a observar la cristalización.');
      return;
    }
    if (stage === 8 && substep === 0) {
      move(glassLid, '0.85 1.99 -4.35', 450);
      substep = 1;
      stageCopy.setAttribute('value', 'Vaso cubierto. Inicia el paso del tiempo o avanza manualmente un día cada vez.');
      updateControls();
      return;
    }
    if (stage === 9 && !extracted) extractSkewer();
  }

  function resetExperiment() {
    if (pendingTimer) clearInterval(pendingTimer);
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = null;
    if (prepTimer) clearTimeout(prepTimer);
    if (doseTimer) clearTimeout(doseTimer);
    prepAnimationTimers.forEach(clearTimeout);
    prepAnimationTimers = [];
    prepTimer = null;
    doseTimer = null;
    stopDayTimer();
    stage = 1;
    substep = 0;
    sugarAdded = 0;
    day = 0;
    extracted = false;
    crystalGrowth.replaceChildren();
    doseGroup.replaceChildren();
    skewer.removeAttribute('animation__move');
    skewer.setAttribute('position', '-0.1 0.82 -3.2');
    skewer.setAttribute('rotation', '0 0 90');
    seedCoating.setAttribute('visible', false);
    measuredWater.setAttribute('visible', false);
    potWater.setAttribute('visible', false);
    potWaterNeck.setAttribute('visible', false);
    glassSolution.setAttribute('visible', false);
    glassLid.setAttribute('visible', false);
    clip.setAttribute('visible', false);
    heatFlame.setAttribute('visible', false);
    boilingBubbles.setAttribute('visible', false);
    temperatureReadout.setAttribute('value', '20 °C');
    potWater.setAttribute('color', '#5ab6bf');
    sugarPile.setAttribute('scale', '1 1 1');
    dayCounter.setAttribute('visible', false);
    scaleReadout.setAttribute('value', '0 g');
    renderStage();
  }

  mainControl.addEventListener('click', performMainAction);
  dayToggle.addEventListener('click', toggleDays);
  dayStep.addEventListener('click', advanceDay);
  resetControl.addEventListener('click', resetExperiment);

  controls.forEach((control) => {
    control.addEventListener('mouseenter', () => control.querySelector('.control-surface').setAttribute('material', 'emissive', '#174238'));
    control.addEventListener('mouseleave', () => control.querySelector('.control-surface').removeAttribute('material', 'emissive'));
  });

  controller.addEventListener('triggerdown', () => {
    const hit = controller.components.raycaster?.intersections.find(({ object }) => object.el?.classList.contains('hit'));
    hit?.object.el.closest('[data-control]')?.emit('click', {}, true);
  });

  scene.addEventListener('enter-vr', () => {
    interactionCursor.setAttribute('cursor', 'rayOrigin', 'entity');
    interactionCursor.setAttribute('cursor', 'fuse', true);
    cursorReticle.setAttribute('visible', true);
  });
  scene.addEventListener('exit-vr', () => {
    interactionCursor.setAttribute('cursor', 'rayOrigin', 'mouse');
    interactionCursor.setAttribute('cursor', 'fuse', false);
    cursorReticle.setAttribute('visible', false);
  });

  renderStage();
})();