# Definirea datelor de bază
meniu = ['papanasi'] * 10 + ['ceafa'] * 3 + ["guias"] * 6
preturi = [["papanasi", 7], ["ceafa", 10], ["guias", 5]]
studenti = ["Liviu", "Ion", "George", "Ana", "Florica"]  # coada FIFO
comenzi = ["guias", "ceafa", "ceafa", "papanasi", "ceafa"]  # coada FIFO
tavi = ["tava"] * 7  # stiva LIFO
istoric_comenzi = []

# 1. Comenzi
while studenti and comenzi and tavi:
    student = studenti.pop(0)  # elimină primul student din coadă
    comanda = comenzi.pop(0)  # elimină prima comandă din coadă
    tava = tavi.pop()  # elimină o tava din stivă
    istoric_comenzi.append(comanda)  # actualizează istoricul comenzilor
    
    print(f"{student} a comandat {comanda}.")

# 2. Inventar
# Contorizarea comenzilor
contor_comenzi = {produs: 0 for produs in ['papanasi', 'ceafa', 'guias']}
for comanda in istoric_comenzi:
    if comanda in contor_comenzi:
        contor_comenzi[comanda] += 1

# Afișarea informațiilor despre comenzi
print(f"S-au comandat {contor_comenzi['guias']} guias, {contor_comenzi['ceafa']} ceafa, {contor_comenzi['papanasi']} papanasi.")
print(f"Mai sunt {len(tavi)} tavi.")

# Verificarea stocurilor
def verifica_stoc(produs):
    return meniu.count(produs) > 0

print(f"Mai este ceafa: {verifica_stoc('ceafa')}.")
print(f"Mai sunt papanasi: {verifica_stoc('papanasi')}.")
print(f"Mai sunt guias: {verifica_stoc('guias')}.")

# 3. Finanțe
# Calcularea totalului vânzărilor
total_incasari = 0
for produs, pret in preturi:
    total_incasari += contor_comenzi[produs] * pret if produs in contor_comenzi else 0

# Produse care costă cel mult 7 lei
produse_accessibile = [item for item in preturi if item[1] <= 7]

print(f"Cantina a încasat: {total_incasari} lei.")
print(f"Produse care costă cel mult 7 lei: {produse_accessibile}.")
