import random

# 1. Lista de cuvinte și alegerea cuvântului la întâmplare
cuvinte = ["python", "programare", "calculator", "date", "algoritm"]
cuvant_de_ghicit = random.choice(cuvinte)
progres = ["_" for _ in cuvant_de_ghicit]

# 2. Inițializarea numărului de încercări
incercari_ramase = 6
litere_incercate = []

# 3. Afișarea șablonului inițial
print("Bine ai venit la jocul Spânzurătoarea!")
print("Cuvântul de ghicit: " + " ".join(progres))
print(f"Încercări rămase: {incercari_ramase}")
print("-" * 30)

# 4. Buclă principală de joc
while incercari_ramase > 0 and "_" in progres:
    # Cererea unei litere
    litera = input("Introduce o literă: ").lower()

    # Verificarea validității literei
    if len(litera) != 1 or not litera.isalpha():
        print("Te rog să introduci o singură literă validă.")
        continue

    if litera in litere_incercate:
        print(f"Ai mai încercat deja litera '{litera}'. Alege o altă literă.")
        continue

    # Adăugarea literei încercate
    litere_incercate.append(litera)

    # Verificarea literei în cuvânt
    if litera in cuvant_de_ghicit:
        # Actualizarea progresului
        for i in range(len(cuvant_de_ghicit)):
            if cuvant_de_ghicit[i] == litera:
                progres[i] = litera
        print(f"Bravo! Litera '{litera}' se află în cuvânt.")
    else:
        # Scăderea încercărilor rămase
        incercari_ramase -= 1
        print(f"Oops! Litera '{litera}' nu se află în cuvânt.")
    
    # Afișarea progresului și încercărilor rămase
    print("Cuvântul de ghicit: " + " ".join(progres))
    print(f"Încercări rămase: {incercari_ramase}")
    print("-" * 30)

# 5. Încheierea jocului
if "_" not in progres:
    print(f"Felicitări! Ai ghicit cuvântul: {cuvant_de_ghicit}")
else:
    print(f"Ai pierdut! Cuvântul era: {cuvant_de_ghicit}")
