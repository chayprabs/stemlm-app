import type {
  PhysicsBenchmarkDifficulty,
  PhysicsBenchmarkSpec,
  PhysicsBenchmarkVerifyResult,
} from '../types';

const NUMERIC_TOKEN_RE = /[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

function inferYear(number: number): 1 | 2 | 3 {
  if (number <= 17) return 1;
  if (number <= 34) return 2;
  return 3;
}

function inferDifficulty(number: number): PhysicsBenchmarkDifficulty {
  if (number <= 12) return 'Easy';
  if (number <= 34) return 'Mid';
  return 'Tough';
}

function normalizeNumericToken(token: string): string {
  const numeric = Number(token);
  if (Number.isFinite(numeric)) return String(numeric);
  return token.toLowerCase();
}

function extractNumericTokens(text: string): string[] {
  const seen = new Set<string>();
  const matches = text.match(NUMERIC_TOKEN_RE) ?? [];
  for (const raw of matches) {
    const normalized = normalizeNumericToken(raw);
    if (normalized.length > 0) seen.add(normalized);
  }
  return [...seen];
}

function createNumericVerifier(question: string): (capsuleText: string) => PhysicsBenchmarkVerifyResult {
  const expectedTokens = extractNumericTokens(question);
  const expectedRequiredHits = Math.min(3, expectedTokens.length);

  return (capsuleText: string): PhysicsBenchmarkVerifyResult => {
    if (!capsuleText.trim()) {
      return { ok: false, errors: ['Capsule text is empty.'] };
    }

    if (expectedTokens.length === 0) {
      return { ok: true, errors: [] };
    }

    const answerTokens = new Set(extractNumericTokens(capsuleText));
    const matched = expectedTokens.filter((token) => answerTokens.has(token));

    if (matched.length >= expectedRequiredHits) {
      return { ok: true, errors: [] };
    }

    return {
      ok: false,
      errors: [
        `Numeric grounding too weak: matched ${matched.length}/${expectedTokens.length} expected numeric tokens from question.`,
      ],
    };
  };
}

function makeSpec(base: Pick<PhysicsBenchmarkSpec, 'id' | 'number' | 'topic' | 'question'>): PhysicsBenchmarkSpec {
  return {
    ...base,
    year: inferYear(base.number),
    difficulty: inferDifficulty(base.number),
    verify: createNumericVerifier(base.question),
  };
}

export const PHYSICS_SPECS: PhysicsBenchmarkSpec[] = [
  makeSpec({ id: 'q01', number: 1, topic: 'Newton Laws Constrained Motion', question: 'A block m1=5 kg on a frictionless incline at θ=30° is connected via a massless string over a frictionless pulley to a hanging mass m2=3 kg. (a) Draw free body diagrams. (b) Write Newton second law for each mass. (c) Find acceleration and tension. (d) With μk=0.2, redo (b) and (c).' }),
  makeSpec({ id: 'q02', number: 2, topic: 'Work-Energy Conservative Forces', question: 'A particle moves under F = (3x²y)î + (x³+2y)ĵ N. (a) Check if F is conservative; find U(x,y) if yes. (b) Work from (0,0) to (2,3). (c) Mass m=2 kg starts at rest at (0,0); find speed at (2,3). (d) Show non-conservative work depends on path.' }),
  makeSpec({ id: 'q03', number: 3, topic: 'Rotational Dynamics Rolling', question: 'A solid sphere (M, R) rolls without slipping down an incline of angle θ and height h. (a) Equations of motion. (b) Linear acceleration; compare to hollow sphere and sliding point mass. (c) Speed at bottom via energy; verify kinematics. (d) Minimum μs for rolling without slipping.' }),
  makeSpec({ id: 'q04', number: 4, topic: 'Central Force Orbits', question: 'A particle of mass m moves under central force F(r)=-k/r². (a) Show L=mr²θ̇ is conserved. (b) Derive orbit equation with u=1/r. (c) Solve r(θ) and identify conic; eccentricity conditions. (d) Period for circular orbit r₀; verify Kepler third law.' }),
  makeSpec({ id: 'q05', number: 5, topic: 'Lagrangian Mechanics Double Pendulum', question: 'Double pendulum: m1 on rod l1, m2 on rod l2; angles θ1, θ2 from vertical. (a) Kinetic and potential energies (exact). (b) Lagrangian L=T-V. (c) Euler-Lagrange equations. (d) Small oscillations; normal mode frequencies for m1=m2=m, l1=l2=l.' }),
  makeSpec({ id: 'q06', number: 6, topic: 'Rigid Body Moment of Inertia Tensor', question: 'Physics angular momentum: uniform thin rectangular plate mass M, width a along x, height b along y. (a) Ixx, Iyy, Izz about CM. (b) Izz about corner via parallel axis. (c) Torque τẑ; angular acceleration about corner. (d) Full inertia tensor; is it diagonal?' }),
  makeSpec({ id: 'q07', number: 7, topic: 'Damped Harmonic Oscillator', question: 'Physics simple harmonic motion: mass m=0.5 kg on spring k=50 N/m with damping force Fd=-bẋ, b=2 N·s/m. (a) Equation of motion; classify damping. (b) ω0, γ, ωd. (c) x(t) for x(0)=0.1 m, ẋ(0)=0. (d) Time to 1/e amplitude; quality factor Q.' }),
  makeSpec({ id: 'q08', number: 8, topic: 'Driven Oscillator Resonance', question: 'Same system as Q7, driven by F(t)=F0 cos(ωt), F0=5 N. (a) Steady-state amplitude A(ω) and phase φ(ω). (b) Resonance frequency ωres. (c) A(ωres) in terms of Q. (d) Sketch A(ω) for under/critical/over damped.' }),
  makeSpec({ id: 'q09', number: 9, topic: 'Coupled Oscillators Normal Modes', question: 'Physics simple harmonic coupled oscillators: two masses m on springs k (wall-m1-spring-m2-wall) with coupling kc. (a) Equations of motion. (b) Normal mode frequencies ω1, ω2. (c) Physical description of modes. (d) General solution for beating.' }),
  makeSpec({ id: 'q10', number: 10, topic: 'Wave Equation Standing Waves', question: 'String L=1 m, μ=0.01 kg/m, tension T=100 N. (a) Wave speed v and fundamental f1. (b) Standing wave solution. (c) y(x,0)=0.02 sin(πx)-0.01 sin(3πx), ẏ(x,0)=0; find y(x,t). (d) Energy in each mode; fraction in fundamental.' }),
  makeSpec({ id: 'q11', number: 11, topic: 'Physics Thermodynamics Entropy', question: 'Physics thermodynamics entropy and energy: A reversible engine operates between Th=600 K and Tc=300 K and delivers work W=10 kJ per cycle. (a) Find efficiency. (b) Find heat absorbed Qh and heat rejected Qc. (c) Compute entropy changes of hot and cold reservoirs and net entropy change. (d) A real engine delivering the same 10 kJ has efficiency 35%; find Qh, Qc, and entropy production.' }),
  makeSpec({ id: 'q12', number: 12, topic: 'Physics Maxwell-Boltzmann Speed Distribution', question: 'Physics kinetic theory: Nitrogen molecules have mass m=4.65e-26 kg at temperature T=300 K. Using Maxwell-Boltzmann statistics, find (a) most probable speed vp, mean speed vbar, and rms speed vrms, (b) write the speed distribution, (c) fraction of molecules with v>2vp, and (d) how these speeds change if temperature doubles.' }),
  makeSpec({ id: 'q13', number: 13, topic: 'Physics Electrostatics Charged Spherical Shell', question: 'Physics electric field and energy: A nonconducting spherical shell has uniform volume charge density rho for a<r<b (inner radius a, outer radius b). (a) Find E(r) in regions r<a, a<r<b, and r>b. (b) Find potential V(r) with V(infinity)=0. (c) Compute electrostatic energy stored. (d) Verify numerically that field energy equals (1/2) integral rho V dV.' }),
  makeSpec({ id: 'q14', number: 14, topic: 'Physics Electrostatics Grounded Conducting Sphere', question: 'Physics electric field boundary-value problem: A grounded conducting sphere of radius R is placed in a uniform external field E0 z-hat. (a) Apply boundary conditions and determine potential coefficients. (b) Write V(r,theta) inside and outside. (c) Find induced surface charge density sigma(theta). (d) Verify net induced charge.' }),
  makeSpec({ id: 'q15', number: 15, topic: 'Physics Magnetic Field Magnetostatics', question: 'Physics magnetic field and force: (a) Find B at the center of a circular wire loop of radius R with steady charge flow I. (b) Find B inside and outside a long solenoid coil (turn density n). (c) Find B in a toroidal coil (N turns) as a function of radius r.' }),
  makeSpec({ id: 'q16', number: 16, topic: 'Electromagnetic Induction and Magnetic Damping', question: 'Physics magnetic field and kinetic energy: a rectangular loop (height l=0.20 m, resistance R=0.50 Ω) moves with velocity v=5.0 m/s into a uniform magnetic field B=0.80 T (into page). Using Faraday-Lenz law, find induced emf and loop direction, then compute the magnetic retarding force and verify conservation of energy. Finally, for a solenoid (N=200, radius 2.0 cm, length 0.40 m) carrying the same I, find its self-inductance L and stored magnetic field energy.' }),
  makeSpec({ id: 'q17', number: 17, topic: 'Maxwell Equations and Electromagnetic Waves', question: 'Physics electromagnetic wave in vacuum: starting from Maxwell equations derive the wave equation for electric field and magnetic field, compute wave speed c numerically from μ0 and ε0, then for a plane wave traveling in +x with E0=120 V/m write E and B fields and compute the time-averaged Poynting vector magnitude.' }),
  makeSpec({ id: 'q18', number: 18, topic: 'Normal-Incidence Fresnel Coefficients', question: 'Physics optics at normal incidence: an electromagnetic wave in air strikes a dielectric with relative permittivity εr=4 and μr≈1. Find refractive index n, Fresnel amplitude coefficients r and t for electric field, and power coefficients R and T. Use incident field amplitude Ei0=30 V/m.' }),
  makeSpec({ id: 'q19', number: 19, topic: 'Infinite Square Well Superposition', question: 'Physics quantum particle in a 1D infinite square well (0<x<L, L=1.0 nm): write eigenfunctions and energies, then for initial state proportional to ψ1+sqrt(3)ψ2 find normalized coefficients and expectation values of energy, position, and momentum at t=0.' }),
  makeSpec({ id: 'q20', number: 20, topic: 'Quantum Harmonic Oscillator Operator Method', question: 'Physics quantum harmonic oscillator using ladder operators: prove commutator [a,a†], use H=ħω(a†a+1/2) to get H|n>, evaluate uncertainties for n=2 with m=1.0e-26 kg and ω=2.0e13 s^-1, and for coherent state α=1.5 compute mean occupation and mean energy.' }),
  makeSpec({ id: 'q21', number: 21, topic: 'Hydrogen Atom Spectrum H-alpha Line', question: 'Physics quantum hydrogen atom transition for the H-alpha line: use energy levels to find wavelength, photon frequency, photon energy, and photon momentum in a wave and field picture with energy and force-scale interpretation.' }),
  makeSpec({ id: 'q22', number: 22, topic: 'First-Order Perturbation in Infinite Square Well', question: 'Physics quantum particle in a 1D square well with perturbation field $V_1(x)=V_0 x/L$: find unperturbed energy, first-order energy shift, corrected ground energy, and compare to level spacing using wave and momentum language.' }),
  makeSpec({ id: 'q23', number: 23, topic: 'Quantum Barrier Transmission', question: 'Physics quantum tunneling through a rectangular barrier: for a particle wave with energy below barrier field height, compute decay constant, transmission probability, and transmitted energy flux interpretation using momentum and force scales.' }),
  makeSpec({ id: 'q24', number: 24, topic: 'Thermodynamic Potentials and Maxwell Relations', question: 'Physics quantum energy and wave-field thermodynamic potentials with Maxwell relations: derive differential identities, evaluate derivative links for a gas model, and compute a finite change with force and momentum interpretation.' }),
  makeSpec({ id: 'q25', number: 25, topic: 'Canonical Ensemble for a Two-Level Quantum System', question: 'Physics quantum canonical ensemble with two energy levels in a field interaction: compute partition function, state probabilities, mean energy, and heat-capacity scale for wave and momentum-based thermal physics.' }),
  makeSpec({ id: 'q26', number: 26, topic: 'Fermi-Dirac and Bose-Einstein Occupation Comparison', question: 'Physics quantum statistics in an energy field: compare Fermi-Dirac and Bose-Einstein occupation numbers at the same energy and momentum state, and show the classical wave-limit approximation.' }),
  makeSpec({ id: 'q27', number: 27, topic: 'Larmor Radiation from Accelerated Charge', question: 'Physics electromagnetic radiation from an accelerated charge: for circular motion in a magnetic field, compute acceleration, Larmor power, and radiated energy per cycle using force, momentum, wave, and energy ideas.' }),
  makeSpec({ id: 'q28', number: 28, topic: 'Retarded Potentials for an Oscillating Dipole', question: 'Physics electromagnetic wave and field from an oscillating dipole using retarded potentials: compute retarded time, far-field amplitudes, magnetic field, and Poynting flux with energy and momentum transport.' }),
  makeSpec({ id: 'q29', number: 29, topic: 'Special Relativity Four-Vectors', question: 'Physics relativity using energy-momentum four-vectors: for a moving particle compute gamma factor, four-momentum components, invariant norm, and transformed energy in another frame with field and force interpretation.' }),
  makeSpec({ id: 'q30', number: 30, topic: 'Clebsch-Gordan Coupling for j1=1 and j2=1/2', question: 'Physics quantum angular momentum addition for j1=1 and j2=1/2: build coupled states, verify normalization and orthogonality coefficients, and extract probability weights relevant to momentum, wave, energy, and field coupling.' }),
  makeSpec({ id: 'q31', number: 31, topic: 'Variational Estimate for Hydrogen Ground State', question: 'Physics quantum variational method for hydrogen: use a trial wavefunction to compute energy functional, optimize the variational parameter, and compare with exact binding energy using field, force, momentum, and wave reasoning.' }),
  makeSpec({ id: 'q32', number: 32, topic: 'Identical Particles in a 1D Infinite Well', question: 'Physics quantum identical particles in a one-dimensional well: build symmetric and antisymmetric wave states, compare allowed energy occupancy for bosons and fermions, and compute total energy and momentum-level consequences.' }),
  makeSpec({ id: 'q33', number: 33, topic: 'Fermi Golden Rule for a Hydrogen Transition', question: 'Physics quantum transition rate in hydrogen using Fermi golden rule: from matrix element and photon-state density in a wave field, compute transition probability rate, lifetime, and energy-momentum emission scale.' }),
  makeSpec({ id: 'q34', number: 34, topic: 'Ising Model Mean-Field Approximation', question: 'Physics Ising mean-field magnetization in a magnetic field: find critical temperature, evaluate finite-temperature magnetization response, and connect energy and force-scale behavior in a spin-wave picture.' }),
  makeSpec({ id: 'q35', number: 35, topic: 'Equipartition Theorem and Virial Relation', question: 'Physics statistical mechanics with equipartition and virial theorem: compute thermal energy and rms momentum scale for a gas, then apply force-law virial balance to relate kinetic and potential energy in bound motion and wave-like oscillation.' }),
  makeSpec({ id: 'q36', number: 36, topic: 'FCC Reciprocal Lattice and Wave Vectors', question: 'Physics crystal wave diffraction problem: for an FCC crystal with lattice constant a=0.361 nm, derive reciprocal primitive vectors, identify the reciprocal lattice type, and compute the reciprocal-wave magnitudes for (111) and (200) along with d-spacing and first-Brillouin-zone scale.' }),
  makeSpec({ id: 'q37', number: 37, topic: 'Free Electron Density of States in Copper', question: 'Physics quantum electron gas in a crystal metal: for copper with electron number density n=8.47e28 m^-3, compute Fermi wave vector, Fermi energy, Fermi velocity, and the free-electron density of states at the Fermi energy.' }),
  makeSpec({ id: 'q38', number: 38, topic: 'Nearly Free Electron Band Gap at Zone Boundary', question: 'Physics crystal electron wave model: in a 1D periodic potential with lattice spacing a=0.30 nm and Fourier component |U_G|=0.20 eV, evaluate the nearly-free-electron energies at the first Brillouin-zone boundary k=pi/a and compute the band-gap size from Bragg diffraction coupling.' }),
  makeSpec({ id: 'q39', number: 39, topic: 'Bethe-Weizsaecker Binding Energy of Fe-56', question: 'Physics nuclear energy estimate: using the Bethe-Weizsaecker mass formula for the Fe-56 nucleus (A=56, Z=26), evaluate each term numerically and compute total binding energy and binding energy per nucleon.' }),
  makeSpec({ id: 'q40', number: 40, topic: 'Radioactive Decay Chain Dynamics', question: 'Physics nuclear decay and photon activity: in a chain A -> B -> C (stable), let N_A(0)=1.00e6, t1/2,A=2.0 h, and t1/2,B=6.0 h. Compute populations at t=5.0 h and compare the two decay activities.' }),
  makeSpec({ id: 'q41', number: 41, topic: 'Michelson and Fabry-Perot Interference', question: 'Physics wave interference optics: for a Michelson interferometer with wavelength 632.8 nm and mirror displacement 0.40 um, find fringe shift; then for a Fabry-Perot cavity with length L=5.0 mm and mirror reflectivity R=0.85 compute FSR, finesse, and linewidth.' }),
  makeSpec({ id: 'q42', number: 42, topic: 'Single-Slit Envelope with Diffraction Grating', question: 'Physics wave diffraction-interference problem: monochromatic light with wavelength 500 nm passes through a grating of period d=40 um where each slit has width a=20 um, and the screen is at L=2.0 m. Find grating maxima positions, single-slit minima, and missing orders.' }),
  makeSpec({ id: 'q43', number: 43, topic: 'Laser Three-Level versus Four-Level Operation', question: 'Physics photon and energy analysis of laser gain media: compare a three-level and four-level laser at wavelength 632.8 nm, with threshold inversion Nth=2.0e16 cm^-3 and total active density N=5.0e18 cm^-3; compute photon energy, required excited fraction, and output power for slope efficiency 0.65 with pump 8 W and threshold pump 2 W.' }),
  makeSpec({ id: 'q44', number: 44, topic: 'Green Function Solution in 1D Field Theory', question: 'Physics electric field boundary-value problem: solve -d^2phi/dx^2=rho/epsilon0 on 0<x<L with phi(0)=phi(L)=0 using the 1D Green function, then evaluate phi and field values for L=0.90 m and a point charge q=2.0 nC located at x0=0.30 m.' }),
  makeSpec({ id: 'q45', number: 45, topic: 'Principal Values of a 2D Stress Tensor', question: 'Physics continuum momentum-flux tensor analysis with crystal force and energy density: for the symmetric tensor [[120,30],[30,80]] MPa, compute principal values, principal-axis angle, and invariant-based equivalent intensity.' }),
  makeSpec({ id: 'q46', number: 46, topic: 'Path Integral for a Free Particle', question: 'Physics quantum path integral for a free electron wave: derive the propagator K(xb,t;xa,0), then evaluate magnitude and phase for xa=0, xb=1.0 nm, t=1.0 fs, and compare with the classical-action contribution.' }),
  makeSpec({ id: 'q47', number: 47, topic: 'Navier-Stokes and Bernoulli in Pipe Flow', question: 'Physics momentum and conservation of energy in pipe flow: using Navier-Stokes for water with rho=1000 kg/m^3 and mu=1.0e-3 Pa·s in a pipe of diameter 0.050 m, length 12 m, and volume rate Q=2.5e-3 m^3/s, find velocity, Reynolds number, pressure loss, and pump power from the Bernoulli relation with friction.' }),
  makeSpec({ id: 'q48', number: 48, topic: 'Lorenz System and Chaotic Dynamics', question: 'Physics nonlinear wave and energy-flow dynamics: for the Lorenz equations with sigma=10, rho=28, beta=8/3 and initial state (x,y,z)=(1,1,1), compute initial derivatives, fixed points, phase-space contraction, and predict error growth from a Lyapunov exponent.' }),
  makeSpec({ id: 'q49', number: 49, topic: 'Schwarzschild Geodesics and Photon Paths', question: 'Physics relativity geodesics around a compact mass: for a non-rotating object of mass M=10 Msun, compute Schwarzschild radius, ISCO radius, orbital speed at ISCO, gravitational redshift at r=4rs, and weak-field photon deflection for impact parameter b=200 km.' }),
  makeSpec({ id: 'q50', number: 50, topic: 'Blackbody Radiation: Planck and Stefan-Boltzmann', question: 'Physics photon wave and energy radiation: for a blackbody at T=5800 K, compute Wien peak wavelength, Planck spectral radiance near 500 nm, total flux from Stefan-Boltzmann law, and luminosity for radius R=6.96e8 m.' }),
];
