/** Physics exam prompts — questions only; solutions/diagrams come from Gemini at runtime. */
import type { PhysicsPromptDef } from './types';

export const PHYSICS_PROMPTS: PhysicsPromptDef[] = [
  {
    "id": "q01",
    "number": 1,
    "topic": "Newton Laws Constrained Motion",
    "question": "A block m1=5 kg on a frictionless incline at θ=30° is connected via a massless string over a frictionless pulley to a hanging mass m2=3 kg. (a) Draw free body diagrams. (b) Write Newton second law for each mass. (c) Find acceleration and tension. (d) With μk=0.2, redo (b) and (c)."
  },
  {
    "id": "q02",
    "number": 2,
    "topic": "Work-Energy Conservative Forces",
    "question": "A particle moves under F = (3x²y)î + (x³+2y)ĵ N. (a) Check if F is conservative; find U(x,y) if yes. (b) Work from (0,0) to (2,3). (c) Mass m=2 kg starts at rest at (0,0); find speed at (2,3). (d) Show non-conservative work depends on path."
  },
  {
    "id": "q03",
    "number": 3,
    "topic": "Rotational Dynamics Rolling",
    "question": "A solid sphere (M, R) rolls without slipping down an incline of angle θ and height h. (a) Equations of motion. (b) Linear acceleration; compare to hollow sphere and sliding point mass. (c) Speed at bottom via energy; verify kinematics. (d) Minimum μs for rolling without slipping."
  },
  {
    "id": "q04",
    "number": 4,
    "topic": "Central Force Orbits",
    "question": "A particle of mass m moves under central force F(r)=-k/r². (a) Show L=mr²θ̇ is conserved. (b) Derive orbit equation with u=1/r. (c) Solve r(θ) and identify conic; eccentricity conditions. (d) Period for circular orbit r₀; verify Kepler third law."
  },
  {
    "id": "q05",
    "number": 5,
    "topic": "Lagrangian Mechanics Double Pendulum",
    "question": "Double pendulum: m1 on rod l1, m2 on rod l2; angles θ1, θ2 from vertical. (a) Kinetic and potential energies (exact). (b) Lagrangian L=T-V. (c) Euler-Lagrange equations. (d) Small oscillations; normal mode frequencies for m1=m2=m, l1=l2=l."
  },
  {
    "id": "q06",
    "number": 6,
    "topic": "Rigid Body Moment of Inertia Tensor",
    "question": "Physics angular momentum: uniform thin rectangular plate mass M, width a along x, height b along y. (a) Ixx, Iyy, Izz about CM. (b) Izz about corner via parallel axis. (c) Torque τẑ; angular acceleration about corner. (d) Full inertia tensor; is it diagonal?"
  },
  {
    "id": "q07",
    "number": 7,
    "topic": "Damped Harmonic Oscillator",
    "question": "Physics simple harmonic motion: mass m=0.5 kg on spring k=50 N/m with damping force Fd=-bẋ, b=2 N·s/m. (a) Equation of motion; classify damping. (b) ω0, γ, ωd. (c) x(t) for x(0)=0.1 m, ẋ(0)=0. (d) Time to 1/e amplitude; quality factor Q."
  },
  {
    "id": "q08",
    "number": 8,
    "topic": "Driven Oscillator Resonance",
    "question": "Same system as Q7, driven by F(t)=F0 cos(ωt), F0=5 N. (a) Steady-state amplitude A(ω) and phase φ(ω). (b) Resonance frequency ωres. (c) A(ωres) in terms of Q. (d) Sketch A(ω) for under/critical/over damped."
  },
  {
    "id": "q09",
    "number": 9,
    "topic": "Coupled Oscillators Normal Modes",
    "question": "Physics simple harmonic coupled oscillators: two masses m on springs k (wall-m1-spring-m2-wall) with coupling kc. (a) Equations of motion. (b) Normal mode frequencies ω1, ω2. (c) Physical description of modes. (d) General solution for beating."
  },
  {
    "id": "q10",
    "number": 10,
    "topic": "Wave Equation Standing Waves",
    "question": "String L=1 m, μ=0.01 kg/m, tension T=100 N. (a) Wave speed v and fundamental f1. (b) Standing wave solution. (c) y(x,0)=0.02 sin(πx)-0.01 sin(3πx), ẏ(x,0)=0; find y(x,t). (d) Energy in each mode; fraction in fundamental."
  },
  {
    "id": "q11",
    "number": 11,
    "topic": "Physics Thermodynamics Entropy",
    "question": "Physics thermodynamics entropy and energy: A reversible engine operates between Th=600 K and Tc=300 K and delivers work W=10 kJ per cycle. (a) Find efficiency. (b) Find heat absorbed Qh and heat rejected Qc. (c) Compute entropy changes of hot and cold reservoirs and net entropy change. (d) A real engine delivering the same 10 kJ has efficiency 35%; find Qh, Qc, and entropy production."
  },
  {
    "id": "q12",
    "number": 12,
    "topic": "Physics Maxwell-Boltzmann Speed Distribution",
    "question": "Physics kinetic theory: Nitrogen molecules have mass m=4.65e-26 kg at temperature T=300 K. Using Maxwell-Boltzmann statistics, find (a) most probable speed vp, mean speed vbar, and rms speed vrms, (b) write the speed distribution, (c) fraction of molecules with v>2vp, and (d) how these speeds change if temperature doubles."
  },
  {
    "id": "q13",
    "number": 13,
    "topic": "Physics Electrostatics Charged Spherical Shell",
    "question": "Physics electric field and energy: A nonconducting spherical shell has uniform volume charge density rho for a<r<b (inner radius a, outer radius b). (a) Find E(r) in regions r<a, a<r<b, and r>b. (b) Find potential V(r) with V(infinity)=0. (c) Compute electrostatic energy stored. (d) Verify numerically that field energy equals (1/2) integral rho V dV."
  },
  {
    "id": "q14",
    "number": 14,
    "topic": "Physics Electrostatics Grounded Conducting Sphere",
    "question": "Physics electric field boundary-value problem: A grounded conducting sphere of radius R is placed in a uniform external field E0 z-hat. (a) Apply boundary conditions and determine potential coefficients. (b) Write V(r,theta) inside and outside. (c) Find induced surface charge density sigma(theta). (d) Verify net induced charge."
  },
  {
    "id": "q15",
    "number": 15,
    "topic": "Physics Magnetic Field Magnetostatics",
    "question": "Physics magnetic field and force: (a) Find B at the center of a circular wire loop of radius R with steady charge flow I. (b) Find B inside and outside a long solenoid coil (turn density n). (c) Find B in a toroidal coil (N turns) as a function of radius r."
  },
  {
    "id": "q16",
    "number": 16,
    "topic": "Electromagnetic Induction and Magnetic Damping",
    "question": "Physics magnetic field and kinetic energy: a rectangular loop (height l=0.20 m, resistance R=0.50 Ω) moves with velocity v=5.0 m/s into a uniform magnetic field B=0.80 T (into page). Using Faraday-Lenz law, find induced emf and loop direction, then compute the magnetic retarding force and verify conservation of energy. Finally, for a solenoid (N=200, radius 2.0 cm, length 0.40 m) carrying the same I, find its self-inductance L and stored magnetic field energy."
  },
  {
    "id": "q17",
    "number": 17,
    "topic": "Maxwell Equations and Electromagnetic Waves",
    "question": "Physics electromagnetic wave in vacuum: starting from Maxwell equations derive the wave equation for electric field and magnetic field, compute wave speed c numerically from μ0 and ε0, then for a plane wave traveling in +x with E0=120 V/m write E and B fields and compute the time-averaged Poynting vector magnitude."
  },
  {
    "id": "q18",
    "number": 18,
    "topic": "Normal-Incidence Fresnel Coefficients",
    "question": "Physics optics at normal incidence: an electromagnetic wave in air strikes a dielectric with relative permittivity εr=4 and μr≈1. Find refractive index n, Fresnel amplitude coefficients r and t for electric field, and power coefficients R and T. Use incident field amplitude Ei0=30 V/m."
  },
  {
    "id": "q19",
    "number": 19,
    "topic": "Infinite Square Well Superposition",
    "question": "Physics quantum particle in a 1D infinite square well (0<x<L, L=1.0 nm): write eigenfunctions and energies, then for initial state proportional to ψ1+sqrt(3)ψ2 find normalized coefficients and expectation values of energy, position, and momentum at t=0."
  },
  {
    "id": "q20",
    "number": 20,
    "topic": "Quantum Harmonic Oscillator Operator Method",
    "question": "Physics quantum harmonic oscillator using ladder operators: prove commutator [a,a†], use H=ħω(a†a+1/2) to get H|n>, evaluate uncertainties for n=2 with m=1.0e-26 kg and ω=2.0e13 s^-1, and for coherent state α=1.5 compute mean occupation and mean energy."
  },
  {
    "id": "q21",
    "number": 21,
    "topic": "Hydrogen Atom Spectrum H-alpha Line",
    "question": "Physics quantum hydrogen atom transition for the H-alpha line: use energy levels to find wavelength, photon frequency, photon energy, and photon momentum in a wave and field picture with energy and force-scale interpretation."
  },
  {
    "id": "q22",
    "number": 22,
    "topic": "First-Order Perturbation in Infinite Square Well",
    "question": "Physics quantum particle in a 1D square well with perturbation field $V_1(x)=V_0 x/L$: find unperturbed energy, first-order energy shift, corrected ground energy, and compare to level spacing using wave and momentum language."
  },
  {
    "id": "q23",
    "number": 23,
    "topic": "Quantum Barrier Transmission",
    "question": "Physics quantum tunneling through a rectangular barrier: for a particle wave with energy below barrier field height, compute decay constant, transmission probability, and transmitted energy flux interpretation using momentum and force scales."
  },
  {
    "id": "q24",
    "number": 24,
    "topic": "Thermodynamic Potentials and Maxwell Relations",
    "question": "Physics quantum energy and wave-field thermodynamic potentials with Maxwell relations: derive differential identities, evaluate derivative links for a gas model, and compute a finite change with force and momentum interpretation."
  },
  {
    "id": "q25",
    "number": 25,
    "topic": "Canonical Ensemble for a Two-Level Quantum System",
    "question": "Physics quantum canonical ensemble with two energy levels in a field interaction: compute partition function, state probabilities, mean energy, and heat-capacity scale for wave and momentum-based thermal physics."
  },
  {
    "id": "q26",
    "number": 26,
    "topic": "Fermi-Dirac and Bose-Einstein Occupation Comparison",
    "question": "Physics quantum statistics in an energy field: compare Fermi-Dirac and Bose-Einstein occupation numbers at the same energy and momentum state, and show the classical wave-limit approximation."
  },
  {
    "id": "q27",
    "number": 27,
    "topic": "Larmor Radiation from Accelerated Charge",
    "question": "Physics electromagnetic radiation from an accelerated charge: for circular motion in a magnetic field, compute acceleration, Larmor power, and radiated energy per cycle using force, momentum, wave, and energy ideas."
  },
  {
    "id": "q28",
    "number": 28,
    "topic": "Retarded Potentials for an Oscillating Dipole",
    "question": "Physics electromagnetic wave and field from an oscillating dipole using retarded potentials: compute retarded time, far-field amplitudes, magnetic field, and Poynting flux with energy and momentum transport."
  },
  {
    "id": "q29",
    "number": 29,
    "topic": "Special Relativity Four-Vectors",
    "question": "Physics relativity using energy-momentum four-vectors: for a moving particle compute gamma factor, four-momentum components, invariant norm, and transformed energy in another frame with field and force interpretation."
  },
  {
    "id": "q30",
    "number": 30,
    "topic": "Clebsch-Gordan Coupling for j1=1 and j2=1/2",
    "question": "Physics quantum angular momentum addition for j1=1 and j2=1/2: build coupled states, verify normalization and orthogonality coefficients, and extract probability weights relevant to momentum, wave, energy, and field coupling."
  },
  {
    "id": "q31",
    "number": 31,
    "topic": "Variational Estimate for Hydrogen Ground State",
    "question": "Physics quantum variational method for hydrogen: use a trial wavefunction to compute energy functional, optimize the variational parameter, and compare with exact binding energy using field, force, momentum, and wave reasoning."
  },
  {
    "id": "q32",
    "number": 32,
    "topic": "Identical Particles in a 1D Infinite Well",
    "question": "Physics quantum identical particles in a one-dimensional well: build symmetric and antisymmetric wave states, compare allowed energy occupancy for bosons and fermions, and compute total energy and momentum-level consequences."
  },
  {
    "id": "q33",
    "number": 33,
    "topic": "Fermi Golden Rule for a Hydrogen Transition",
    "question": "Physics quantum transition rate in hydrogen using Fermi golden rule: from matrix element and photon-state density in a wave field, compute transition probability rate, lifetime, and energy-momentum emission scale."
  },
  {
    "id": "q34",
    "number": 34,
    "topic": "Ising Model Mean-Field Approximation",
    "question": "Physics Ising mean-field magnetization in a magnetic field: find critical temperature, evaluate finite-temperature magnetization response, and connect energy and force-scale behavior in a spin-wave picture."
  },
  {
    "id": "q35",
    "number": 35,
    "topic": "Equipartition Theorem and Virial Relation",
    "question": "Physics statistical mechanics with equipartition and virial theorem: compute thermal energy and rms momentum scale for a gas, then apply force-law virial balance to relate kinetic and potential energy in bound motion and wave-like oscillation."
  },
  {
    "id": "q36",
    "number": 36,
    "topic": "FCC Reciprocal Lattice and Wave Vectors",
    "question": "Physics crystal wave diffraction problem: for an FCC crystal with lattice constant a=0.361 nm, derive reciprocal primitive vectors, identify the reciprocal lattice type, and compute the reciprocal-wave magnitudes for (111) and (200) along with d-spacing and first-Brillouin-zone scale."
  },
  {
    "id": "q37",
    "number": 37,
    "topic": "Free Electron Density of States in Copper",
    "question": "Physics quantum electron gas in a crystal metal: for copper with electron number density n=8.47e28 m^-3, compute Fermi wave vector, Fermi energy, Fermi velocity, and the free-electron density of states at the Fermi energy."
  },
  {
    "id": "q38",
    "number": 38,
    "topic": "Nearly Free Electron Band Gap at Zone Boundary",
    "question": "Physics crystal electron wave model: in a 1D periodic potential with lattice spacing a=0.30 nm and Fourier component |U_G|=0.20 eV, evaluate the nearly-free-electron energies at the first Brillouin-zone boundary k=pi/a and compute the band-gap size from Bragg diffraction coupling."
  },
  {
    "id": "q39",
    "number": 39,
    "topic": "Bethe-Weizsaecker Binding Energy of Fe-56",
    "question": "Physics nuclear energy estimate: using the Bethe-Weizsaecker mass formula for the Fe-56 nucleus (A=56, Z=26), evaluate each term numerically and compute total binding energy and binding energy per nucleon."
  },
  {
    "id": "q40",
    "number": 40,
    "topic": "Radioactive Decay Chain Dynamics",
    "question": "Physics nuclear decay and photon activity: in a chain A -> B -> C (stable), let N_A(0)=1.00e6, t1/2,A=2.0 h, and t1/2,B=6.0 h. Compute populations at t=5.0 h and compare the two decay activities."
  },
  {
    "id": "q41",
    "number": 41,
    "topic": "Michelson and Fabry-Perot Interference",
    "question": "Physics wave interference optics: for a Michelson interferometer with wavelength 632.8 nm and mirror displacement 0.40 um, find fringe shift; then for a Fabry-Perot cavity with length L=5.0 mm and mirror reflectivity R=0.85 compute FSR, finesse, and linewidth."
  },
  {
    "id": "q42",
    "number": 42,
    "topic": "Single-Slit Envelope with Diffraction Grating",
    "question": "Physics wave diffraction-interference problem: monochromatic light with wavelength 500 nm passes through a grating of period d=40 um where each slit has width a=20 um, and the screen is at L=2.0 m. Find grating maxima positions, single-slit minima, and missing orders."
  },
  {
    "id": "q43",
    "number": 43,
    "topic": "Laser Three-Level versus Four-Level Operation",
    "question": "Physics photon and energy analysis of laser gain media: compare a three-level and four-level laser at wavelength 632.8 nm, with threshold inversion Nth=2.0e16 cm^-3 and total active density N=5.0e18 cm^-3; compute photon energy, required excited fraction, and output power for slope efficiency 0.65 with pump 8 W and threshold pump 2 W."
  },
  {
    "id": "q44",
    "number": 44,
    "topic": "Green Function Solution in 1D Field Theory",
    "question": "Physics electric field boundary-value problem: solve -d^2phi/dx^2=rho/epsilon0 on 0<x<L with phi(0)=phi(L)=0 using the 1D Green function, then evaluate phi and field values for L=0.90 m and a point charge q=2.0 nC located at x0=0.30 m."
  },
  {
    "id": "q45",
    "number": 45,
    "topic": "Principal Values of a 2D Stress Tensor",
    "question": "Physics continuum momentum-flux tensor analysis with crystal force and energy density: for the symmetric tensor [[120,30],[30,80]] MPa, compute principal values, principal-axis angle, and invariant-based equivalent intensity."
  },
  {
    "id": "q46",
    "number": 46,
    "topic": "Path Integral for a Free Particle",
    "question": "Physics quantum path integral for a free electron wave: derive the propagator K(xb,t;xa,0), then evaluate magnitude and phase for xa=0, xb=1.0 nm, t=1.0 fs, and compare with the classical-action contribution."
  },
  {
    "id": "q47",
    "number": 47,
    "topic": "Navier-Stokes and Bernoulli in Pipe Flow",
    "question": "Physics momentum and conservation of energy in pipe flow: using Navier-Stokes for water with rho=1000 kg/m^3 and mu=1.0e-3 Pa·s in a pipe of diameter 0.050 m, length 12 m, and volume rate Q=2.5e-3 m^3/s, find velocity, Reynolds number, pressure loss, and pump power from the Bernoulli relation with friction."
  },
  {
    "id": "q48",
    "number": 48,
    "topic": "Lorenz System and Chaotic Dynamics",
    "question": "Physics nonlinear wave and energy-flow dynamics: for the Lorenz equations with sigma=10, rho=28, beta=8/3 and initial state (x,y,z)=(1,1,1), compute initial derivatives, fixed points, phase-space contraction, and predict error growth from a Lyapunov exponent."
  },
  {
    "id": "q49",
    "number": 49,
    "topic": "Schwarzschild Geodesics and Photon Paths",
    "question": "Physics relativity geodesics around a compact mass: for a non-rotating object of mass M=10 Msun, compute Schwarzschild radius, ISCO radius, orbital speed at ISCO, gravitational redshift at r=4rs, and weak-field photon deflection for impact parameter b=200 km."
  },
  {
    "id": "q50",
    "number": 50,
    "topic": "Blackbody Radiation: Planck and Stefan-Boltzmann",
    "question": "Physics photon wave and energy radiation: for a blackbody at T=5800 K, compute Wien peak wavelength, Planck spectral radiance near 500 nm, total flux from Stefan-Boltzmann law, and luminosity for radius R=6.96e8 m."
  },
  {
    "id": "q51",
    "number": 51,
    "topic": "Banked Curve No Friction",
    "question": "Physics: A car travels on a frictionless banked circular track of radius r=120 m with banking angle θ=28°. (a) Derive the ideal speed v=√(rg tanθ) for no lateral friction. (b) Compute v in m/s. (c) Find the required centripetal acceleration. (d) If speed is 30 m/s, find the normal force per unit mass needed from the bank."
  },
  {
    "id": "q52",
    "number": 52,
    "topic": "Physical Pendulum",
    "question": "Physics: A uniform rod of length L=0.80 m and mass m=2.0 kg pivots without friction about one end. (a) Write the moment of inertia I=(1/3)mL² about the pivot. (b) Locate the center-of-mass distance h=L/2. (c) Find the small-angle period T=2π√(I/(mgh)). (d) Compute the angular frequency ω=2π/T."
  },
  {
    "id": "q53",
    "number": 53,
    "topic": "Buoyancy and Archimedes Principle",
    "question": "Physics: A wooden block has density ρ_wood=600 kg/m³ and volume V=0.050 m³ in water (ρ_water=1000 kg/m³, g=9.8 m/s²). (a) Find block weight. (b) Find fully submerged buoyant force. (c) Find equilibrium submerged fraction f=ρ_wood/ρ_water. (d) Find the upward force needed to hold the block fully submerged."
  },
  {
    "id": "q54",
    "number": 54,
    "topic": "Capillary Rise",
    "question": "Physics: Water (surface tension γ=0.072 N/m, contact angle θ=0°, density ρ=1000 kg/m³) rises in a glass capillary of radius r=0.50 mm. (a) Use Jurin height h=2γ cosθ/(ρgr). (b) Compute h in mm. (c) Find the gauge pressure jump ΔP=2γ/r across the meniscus. (d) Estimate the mass of the raised column in the tube."
  },
  {
    "id": "q55",
    "number": 55,
    "topic": "Parallel Plate Poiseuille Flow",
    "question": "Physics: Viscous fluid (μ=0.80 Pa·s) flows steadily between parallel plates separated by h=2.0 mm with pressure gradient dP/dx=-4.0×10³ Pa/m. (a) Use Poiseuille parabolic profile v_max=-(h²/8μ)(dP/dx). (b) Find v_max. (c) Find average speed v̄=v_max/2. (d) Compute volume flow rate per unit width Q=∫v dy over the gap."
  },
  {
    "id": "q56",
    "number": 56,
    "topic": "Heat Conduction Flux",
    "question": "Physics: A copper slab (thermal conductivity k=400 W/(m·K)) has thickness L=5.0 mm with faces at T_hot=360 K and T_cold=300 K. (a) Find temperature gradient dT/dx. (b) Compute Fourier heat flux q=-k dT/dx. (c) Find heat current through area A=0.020 m². (d) Estimate steady heat energy transferred in Δt=60 s."
  },
  {
    "id": "q57",
    "number": 57,
    "topic": "Carnot Refrigerator COP",
    "question": "Physics: A Carnot refrigerator operates between a cold reservoir T_c=250 K and a hot reservoir T_h=350 K, removing Q_c=8.0×10³ J per cycle. (a) Find Carnot coefficient of performance COP_R=T_c/(T_h-T_c). (b) Compute required work W per cycle. (c) Find heat rejected Q_h=Q_c+W. (d) Compare to a real refrigerator with COP_R=3.5 and find its work input."
  },
  {
    "id": "q58",
    "number": 58,
    "topic": "Van der Waals Gas Pressure",
    "question": "Physics: One mole of CO₂ is described by van der Waals equation (P+a/V²)(V-b)=RT with a=3.64 L²·bar/mol², b=4.27×10⁻² L/mol, T=400 K, V=0.50 L, R=0.08314 L·bar/(mol·K). (a) Convert constants to consistent units. (b) Compute pressure P. (c) Compute ideal-gas pressure P_ideal=RT/V. (d) Find the correction fraction (P-P_ideal)/P_ideal."
  },
  {
    "id": "q59",
    "number": 59,
    "topic": "Mean Free Path",
    "question": "Physics: Nitrogen gas at T=300 K and P=1.0×10⁵ Pa has molecular diameter d=3.7×10⁻¹⁰ m. Use n=P/(k_B T), σ=πd², and ℓ=1/(√2 n σ). (a) Compute number density n. (b) Find collision cross section σ. (c) Calculate mean free path ℓ in meters. (d) Estimate average collision frequency ν=v̄/ℓ using v̄=√(8k_B T/(πm)) with m=4.65×10⁻²⁶ kg."
  },
  {
    "id": "q60",
    "number": 60,
    "topic": "Dielectric Sphere Depolarization",
    "question": "Physics: A uniform dielectric sphere (radius a=0.10 m, relative permittivity ε_r=5) is placed in a uniform external field E₀=2.0×10⁵ V/m. (a) Find depolarization factor N=1/3 for a sphere. (b) Compute internal field E_in=E₀/(1+(ε_r-1)N). (c) Find induced dipole moment per unit volume P=ε₀(ε_r-1)E_in. (d) Compute surface-bound charge density at the equator σ_b=P/3."
  },
  {
    "id": "q61",
    "number": 61,
    "topic": "Magnetic Dipole on Axis",
    "question": "Physics: A magnetic dipole moment m=0.40 A·m² points along +z. (a) Write on-axis field B(z)=(μ₀/4π)·2m/z³ for z≫source size. (b) Find B at z=0.20 m. (c) Find the axial field gradient dB/dz at that point. (d) Compute the axial force on a distant dipole m₂=0.10 A·m² aligned with m at the same location (F=(μ₀/4π)·6m m₂/z⁴)."
  },
  {
    "id": "q62",
    "number": 62,
    "topic": "RL Circuit Time Constant",
    "question": "Physics: An RL series circuit has R=120 Ω, L=0.60 H, and DC source V_s=12 V. Initially the switch is open and current is zero. (a) Find time constant τ=L/R. (b) Write i(t)=(V_s/R)(1-e^{-t/τ}). (c) Compute steady current I_∞. (d) Find current after t=τ and the stored energy U=½LI² at that instant."
  },
  {
    "id": "q63",
    "number": 63,
    "topic": "LC Resonance",
    "question": "Physics: An ideal LC tank has L=2.5 mH and C=40 nF. (a) Find resonant angular frequency ω₀=1/√(LC). (b) Compute resonant frequency f₀. (c) Find characteristic impedance Z₀=√(L/C). (d) If initial capacitor voltage is V₀=5.0 V and q_max=CV₀, compute peak current I_max=ω₀q_max."
  },
  {
    "id": "q64",
    "number": 64,
    "topic": "Rectangular Waveguide TE10 Cutoff",
    "question": "Physics: A rectangular waveguide has width a=2.30 cm, height b=1.00 cm, filled with air. For TE₁₀ mode: (a) derive cutoff k_c=π/a and f_c=c k_c/(2π). (b) Compute f_c in GHz. (c) At operating frequency f=12.0 GHz, find guide wavelength λ_g=λ₀/√(1-(f_c/f)²) with λ₀=c/f. (d) Compute the phase velocity v_p=c/√(1-(f_c/f)²)."
  },
  {
    "id": "q65",
    "number": 65,
    "topic": "Compton Shift",
    "question": "Physics: X-rays of wavelength λ₀=0.120 nm scatter at θ=60° from a free electron initially at rest. (a) Use Δλ=(h/(m_e c))(1-cosθ). (b) Compute Δλ in pm. (c) Find scattered wavelength λ=λ₀+Δλ. (d) Compute the recoil electron kinetic energy K_e=hc(1/λ₀-1/λ)."
  },
  {
    "id": "q66",
    "number": 66,
    "topic": "de Broglie Wavelength",
    "question": "Physics: An electron is accelerated through a potential difference V=150 V. (a) Find nonrelativistic speed v=√(2eV/m_e). (b) Compute de Broglie wavelength λ=h/(m_e v). (c) Compare to Bohr radius a₀ and give ratio λ/a₀. (d) Repeat λ using the shortcut λ=h/√(2m_e eV) and verify consistency."
  },
  {
    "id": "q67",
    "number": 67,
    "topic": "Photoelectric Stopping Potential",
    "question": "Physics: Light of wavelength λ=250 nm illuminates a metal with work function φ=4.20 eV. (a) Compute photon energy E_ph=hc/λ in eV. (b) Find maximum photoelectron kinetic energy K_max. (c) Determine stopping potential V_stop=K_max/e. (d) If photocurrent is 2.0 μA, estimate electron emission rate."
  },
  {
    "id": "q68",
    "number": 68,
    "topic": "Bohr Radius Hydrogen",
    "question": "Physics: For hydrogen in the Bohr model use a₀=4πε₀ħ²/(m_e e²). (a) Compute a₀ in meters and nm. (b) Find ground-state velocity v₁=e²/(4πε₀ħ). (c) Compute ground-state energy E₁=-m_e e⁴/(32π²ε₀²ħ²) in eV. (d) Find the orbital frequency f₁=v₁/(2πa₀)."
  },
  {
    "id": "q69",
    "number": 69,
    "topic": "Rydberg Energy",
    "question": "Physics: Hydrogen energy levels are E_n=-13.6 eV/n². (a) Compute E₂ and E₃. (b) Find transition energy ΔE for n=3→2 (Hα). (c) Convert ΔE to photon wavelength λ=hc/ΔE. (d) Compute the Rydberg constant R∞=m_e e⁴/(8ε₀²h³c) and verify λ from 1/λ=R∞(1/2²-1/3²)."
  },
  {
    "id": "q70",
    "number": 70,
    "topic": "Zeeman Splitting Scale",
    "question": "Physics: A hydrogen atom in a weak magnetic field B=1.5 T shows normal Zeeman splitting. Use μ_B=eħ/(2m_e). (a) Compute Bohr magneton μ_B in J/T. (b) Find energy shift ΔE=μ_B B for m_J=±1 (Landé g≈1). (c) Convert ΔE to eV. (d) Estimate corresponding photon wavelength shift Δλ≈(λ²/hc)ΔE for λ=656 nm."
  },
  {
    "id": "q71",
    "number": 71,
    "topic": "Debye Frequency Estimate",
    "question": "Physics: Copper has Debye temperature Θ_D=343 K and N atoms in a solid. (a) Use ω_D≈k_B Θ_D/ħ. (b) Compute ω_D in rad/s. (c) Find Debye frequency f_D=ω_D/(2π) in THz. (d) At T=300 K, estimate average phonon energy scale ⟨E⟩≈3k_B T and compare to ħω_D."
  },
  {
    "id": "q72",
    "number": 72,
    "topic": "Hall Voltage",
    "question": "Physics: A copper strip (thickness t=0.20 mm, carrier density n=8.5×10²⁸ m⁻³) carries current I=3.0 A in a transverse magnetic field B=0.50 T. (a) Find current density j=I/(wt) with w=5.0 mm. (b) Compute Hall field E_H=Bj/(ne). (c) Find Hall voltage V_H=E_H w. (d) Determine Hall coefficient R_H=1/(ne)."
  },
  {
    "id": "q73",
    "number": 73,
    "topic": "Cyclotron Frequency",
    "question": "Physics: A proton (m_p=1.673×10⁻²⁷ kg, q=1.602×10⁻¹⁹ C) moves in a uniform magnetic field B=0.80 T. (a) Derive cyclotron angular frequency ω_c=qB/m. (b) Compute f_c=ω_c/(2π). (c) Find cyclotron radius for kinetic energy K=2.0 MeV. (d) Estimate the period T_c=1/f_c."
  },
  {
    "id": "q74",
    "number": 74,
    "topic": "Synchrotron Radiation Larmor Power",
    "question": "Physics: An electron (γ=40) travels in a bending magnet with radius ρ=25 m. (a) Use Larmor formula P=(e²a²)/(6πε₀c³) with a=v²/ρ and v≈c. (b) Compute P in watts. (c) Find total energy loss per turn U=P·(2πρ/c). (d) Express U in keV and compare to electron rest energy m_e c²."
  },
  {
    "id": "q75",
    "number": 75,
    "topic": "Gravitational Wave Strain Estimate",
    "question": "Physics: A binary neutron-star merger at distance D=40 Mpc radiates gravitational-wave energy E_GW≈10⁻² M_⊙c² over duration τ=0.10 s. Use h≈√(4G E_GW/(D² c⁴ τ²)) as an order-of-magnitude strain. Take M_⊙=2.0×10³⁰ kg, G=6.67×10⁻¹¹ N·m²/kg², 1 Mpc=3.09×10²² m. (a) Convert D to meters. (b) Compute E_GW in joules. (c) Estimate strain h. (d) Give h in units of 10⁻²¹."
  },
  {
    "id": "q76",
    "number": 76,
    "topic": "Adiabatic Gas Expansion",
    "question": "Physics: One mole of diatomic ideal gas (γ=1.40) with initial state P₁=3.0×10⁵ Pa, V₁=0.020 m³, T₁=400 K expands adiabatically and reversibly to V₂=3V₁. (a) Use T₂/T₁=(V₁/V₂)^(γ−1) and P₂/P₁=(V₁/V₂)^γ. (b) Compute T₂ and P₂. (c) Find expansion work W=(P₁V₁−P₂V₂)/(γ−1). (d) Verify ΔU=−W for an adiabatic process."
  },
  {
    "id": "q77",
    "number": 77,
    "topic": "Otto Engine Efficiency",
    "question": "Physics: An Otto-cycle engine operates on air (γ=1.40) with compression ratio r=V_max/V_min=9.0. (a) Derive thermal efficiency η=1−1/r^(γ−1). (b) Compute η numerically. (c) If each cycle absorbs Q_h=2.50×10³ J, find work output W=ηQ_h. (d) Find heat rejected Q_c=Q_h−W."
  },
  {
    "id": "q78",
    "number": 78,
    "topic": "Maxwell Speed Distribution Width",
    "question": "Physics: Nitrogen molecules (m=4.65×10⁻²⁶ kg) at T=350 K obey Maxwell-Boltzmann statistics. (a) Compute most probable speed v_p=√(2k_B T/m) and rms speed v_rms=√(3k_B T/m). (b) Find speed standard deviation σ=√(k_B T/m·(3−8/π)). (c) Evaluate the ratio v_rms/v_p. (d) Estimate the fraction of molecules within one σ of v_p using a Gaussian approximation."
  },
  {
    "id": "q79",
    "number": 79,
    "topic": "Stefan Problem Scaling",
    "question": "Physics: A semi-infinite slab (thermal diffusivity α=k/(ρc)=0.80/(920×2100) m²/s) initially at T₀=20°C has its surface held at 0°C for t>0. The thermal penetration depth scales as x∝√(αt). (a) Compute x₁ at t₁=100 s. (b) Compute x₂ at t₂=400 s. (c) Verify the scaling ratio x₂/x₁. (d) Predict x₃ at t₃=900 s using the same scaling law."
  },
  {
    "id": "q80",
    "number": 80,
    "topic": "Bragg Law Diffraction",
    "question": "Physics: Cu Kα X-rays (λ=1.54 Å) diffract from an FCC copper crystal (lattice constant a=0.361 nm) from (111) planes. (a) Find d-spacing d=a/√(h²+k²+l²). (b) Apply Bragg law nλ=2d sinθ for n=1. (c) Compute Bragg angle θ in degrees. (d) Report the corresponding 2θ diffraction angle."
  },
  {
    "id": "q81",
    "number": 81,
    "topic": "X-ray Wavelength from Crystal",
    "question": "Physics: Powder diffraction from copper (111) planes with d=0.2084 nm shows a first-order peak at 2θ=38.5°. (a) Use λ=2d sinθ with θ=2θ/2. (b) Compute wavelength λ in angstroms. (c) Identify whether the peak is consistent with Cu Kα (λ≈1.54 Å). (d) Compute the glancing angle θ in degrees."
  },
  {
    "id": "q82",
    "number": 82,
    "topic": "Fabry-Perot Finesse Variant",
    "question": "Physics: A Fabry-Perot cavity has length L=8.0 mm and mirror reflectivity R=0.92 at λ=633 nm. (a) Find free spectral range FSR=c/(2L). (b) Compute finesse F=π√R/(1−R). (c) Determine linewidth δν=FSR/F. (d) Estimate the resolving power R_res≈F at order m=1."
  },
  {
    "id": "q83",
    "number": 83,
    "topic": "Thin Lens Maker Equation",
    "question": "Physics: A thin converging lens in air is made of glass with n=1.52, R₁=+15 cm (convex toward object), and R₂=−30 cm. (a) Use 1/f=(n−1)(1/R₁−1/R₂) to find focal length f. (b) An object is placed at u=40 cm; solve 1/f=1/u+1/v for image distance v. (c) Compute magnification m=−v/u. (d) State whether the image is real or virtual."
  },
  {
    "id": "q84",
    "number": 84,
    "topic": "Microscope Angular Resolution",
    "question": "Physics: An oil-immersion microscope objective has numerical aperture NA=1.25 and uses light of wavelength λ=550 nm. (a) Apply the Rayleigh criterion θ_min=0.61λ/NA (radians). (b) Convert θ_min to arcseconds. (c) Find the minimum resolvable separation d_min=0.61λ/NA in nanometers. (d) Compare d_min to the wavelength λ."
  },
  {
    "id": "q85",
    "number": 85,
    "topic": "Uncertainty Principle Product",
    "question": "Physics: An electron is confined in a one-dimensional region of width L=0.10 nm. Take position uncertainty Δx≈L/2. (a) Use Δx Δp≥ħ/2 to find minimum momentum uncertainty Δp. (b) Estimate minimum kinetic energy ΔE≈(Δp)²/(2m_e). (c) Express ΔE in eV. (d) Compare ΔE to the ground-state energy of a 0.10 nm infinite square well."
  },
  {
    "id": "q86",
    "number": 86,
    "topic": "Neutron Diffraction Wavelength",
    "question": "Physics: Thermal neutrons (m_n=1.675×10⁻²⁷ kg) have kinetic energy E=0.025 eV. (a) Compute momentum p=√(2m_n E). (b) Find de Broglie wavelength λ=h/p. (c) Express λ in nanometers and angstroms. (d) State whether λ is suitable for resolving atomic spacings d≈0.2 nm."
  },
  {
    "id": "q87",
    "number": 87,
    "topic": "Nuclear Q-value Alpha Decay",
    "question": "Physics: ²³⁸U undergoes alpha decay: ²³⁸U→²³⁴Th+⁴He. Atomic masses are m(²³⁸U)=238.050788 u, m(²³⁴Th)=234.043601 u, m(⁴He)=4.002603 u. (a) Compute mass defect Δm. (b) Convert Q-value Q=Δm c² using 1 u c²=931.5 MeV. (c) Find the alpha kinetic energy in the rest frame of ²³⁸U (nonrelativistic approximation). (d) Compute recoil kinetic energy of ²³⁴Th."
  },
  {
    "id": "q88",
    "number": 88,
    "topic": "Binding Energy per Nucleon Curve Peak",
    "question": "Physics: Use the semi-empirical mass formula with a_V=15.8 MeV, a_S=18.3 MeV, a_C=0.714 MeV, a_A=23.2 MeV, a_P=12 MeV for nuclei ¹²C (A=12,Z=6), ⁵⁶Fe (A=56,Z=26), and ²³⁸U (A=238,Z=92). (a) Compute binding energy per nucleon B/A for each. (b) Identify which nucleus lies nearest the maximum of the curve. (c) Find the binding energy difference per nucleon between ⁵⁶Fe and ¹²C. (d) Explain why iron-region nuclei maximize B/A."
  },
  {
    "id": "q89",
    "number": 89,
    "topic": "Half-life Carbon Dating",
    "question": "Physics: A wooden artifact has ¹⁴C activity ratio N/N₀=0.30 relative to modern wood. The ¹⁴C half-life is t₁/₂=5730 yr. (a) Use t=t₁/₂ ln(N₀/N)/ln2. (b) Compute sample age in years. (c) Find the fraction of original ¹⁴C nuclei remaining. (d) Estimate the uncertainty if N/N₀=0.30±0.03 (linear propagation only)."
  },
  {
    "id": "q90",
    "number": 90,
    "topic": "Doppler Effect Sound",
    "question": "Physics: A stationary ambulance siren emits f₀=440 Hz. A listener moves toward the source at v_o=25 m/s in still air with sound speed v_s=343 m/s. (a) Use f′=f₀(v_s+v_o)/v_s for a moving observer. (b) Compute observed frequency f′. (c) Find the beat frequency if the listener also hears a reflected echo from a wall behind them (qualitative estimate using round-trip Doppler shift). (d) Compute wavelength λ′=v_s/f′."
  },
  {
    "id": "q91",
    "number": 91,
    "topic": "Mach Number Shock",
    "question": "Physics: A jet flies at v=340 m/s where the local sound speed is c_s=295 m/s. (a) Compute Mach number M=v/c_s. (b) Determine whether the flow is supersonic. (c) Find the Mach cone half-angle μ=arcsin(1/M) in degrees. (d) Estimate the overpressure jump across a weak normal shock using the Rankine-Hugoniot relation ΔP/P≈(2γ/(γ+1))(M²−1) with γ=1.4."
  },
  {
    "id": "q92",
    "number": 92,
    "topic": "Reynolds Pipe Transition",
    "question": "Physics: Water (ρ=998 kg/m³, μ=1.0×10⁻³ Pa·s) flows in a pipe of diameter D=0.025 m at average speed v=1.2 m/s. (a) Compute Reynolds number Re=ρvD/μ. (b) Classify the flow relative to the transition threshold Re≈2300. (c) Find the critical speed v_c for Re=2300 at the same D. (d) Compute the pressure-drop scaling ratio if speed is reduced to v_c (ΔP∝v²)."
  },
  {
    "id": "q93",
    "number": 93,
    "topic": "Bernoulli Venturi",
    "question": "Physics: A horizontal venturi meter carries water (ρ=1000 kg/m³) with inlet diameter D₁=0.12 m, throat diameter D₂=0.06 m, inlet speed v₁=1.5 m/s, and inlet pressure P₁=180 kPa. (a) Use continuity to find throat speed v₂. (b) Apply Bernoulli P₁+½ρv₁²=P₂+½ρv₂². (c) Compute throat pressure P₂. (d) Find the pressure difference ΔP=P₁−P₂."
  },
  {
    "id": "q94",
    "number": 94,
    "topic": "Young Modulus Stress Strain",
    "question": "Physics: A steel wire of length L=2.0 m and diameter d=1.2 mm is loaded with F=60 N, producing extension ΔL=1.5 mm. (a) Compute cross-sectional area A=π(d/2)². (b) Find stress σ=F/A and strain ε=ΔL/L. (c) Determine Young modulus E=σ/ε. (d) Compare E to typical steel (≈2.0×10¹¹ Pa)."
  },
  {
    "id": "q95",
    "number": 95,
    "topic": "Torsion Pendulum",
    "question": "Physics: A torsion pendulum uses a solid disk (M=1.20 kg, radius R=0.075 m) on a steel fiber of length L=0.60 m and diameter d=0.45 mm (shear modulus G=8.0×10¹⁰ Pa). (a) Find disk moment of inertia I=½MR². (b) Compute fiber polar moment J=πd⁴/32. (c) Use T=2π√(IL/(GJ)) for the period. (d) Find the angular frequency ω=2π/T."
  },
  {
    "id": "q96",
    "number": 96,
    "topic": "Kepler Third Law Exoplanet",
    "question": "Physics: An exoplanet orbits a star of mass M=0.85 M_⊙ with observed period P=267 days. (a) Convert P to years. (b) Use Kepler third law in solar units a³=(P_yr)²M/M_⊙ with a in AU. (c) Compute semimajor axis a. (d) Compare a to Earth-Sun distance (1 AU)."
  },
  {
    "id": "q97",
    "number": 97,
    "topic": "Hubble Law Distance",
    "question": "Physics: A galaxy shows recession velocity v=2500 km/s. Use Hubble law v=H₀d with H₀=72 km/s/Mpc. (a) Compute distance d in Mpc. (b) Convert d to light-years using 1 Mpc≈3.26×10⁶ ly. (c) Estimate lookback time t≈d/c in Gyr (use d in Mpc and H₀). (d) Discuss whether this is a luminosity distance or comoving distance at low redshift."
  },
  {
    "id": "q98",
    "number": 98,
    "topic": "Cosmic Microwave Background Temperature",
    "question": "Physics: The cosmic microwave background (CMB) has blackbody temperature T=2.725 K. (a) Use Wien law λ_max=2.898×10⁻³/T m to find peak wavelength. (b) Convert λ_max to mm. (c) Estimate peak photon energy E_ph=hc/λ_max in meV. (d) Compute the CMB photon number density n_γ≈2.03×10⁷ T³ m⁻³ and evaluate at T=2.725 K."
  },
  {
    "id": "q99",
    "number": 99,
    "topic": "Neutrino Oscillation Scale",
    "question": "Physics: Atmospheric neutrino oscillations are characterized by mass-squared splitting Δm²≈2.5×10⁻³ eV². For neutrino energy E=500 MeV, (a) use the order-of-magnitude oscillation length L_osc≈2.48 E(GeV)/Δm²(eV²) meters. (b) Compute L_osc in meters and kilometers. (c) State whether kilometer-scale baselines are sensitive to this splitting. (d) Compare to solar Δm²≈7.5×10⁻⁵ eV² oscillation length at E=10 MeV."
  },
  {
    "id": "q100",
    "number": 100,
    "topic": "Integrated Cosmology H0 and Critical Density",
    "question": "Physics: For a flat universe with H₀=70 km/s/Mpc (h=0.70), Ω_m=0.30, and Ω_Λ=0.70: (a) Convert H₀ to SI units s⁻¹. (b) Compute critical density ρ_c=3H₀²/(8πG). (c) Find matter density ρ_m=Ω_m ρ_c. (d) Estimate Hubble time t_H=1/H₀ in Gyr and compare to the ΛCDM age t₀≈13.8 Gyr."
  }
] as PhysicsPromptDef[];

export function getPhysicsPromptByNumber(n: number): PhysicsPromptDef | undefined {
  return PHYSICS_PROMPTS.find((q) => q.number === n);
}
