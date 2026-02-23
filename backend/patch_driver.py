import os
import glob

files = glob.glob(r'c:\Users\adnan\Desktop\MAJOR PROJECT\competative coding patform\backend\problems\*\driver.cpp')
for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    # Simple replace to ensure using namespace std comes before include solution.cpp
    if '#include "solution.cpp"\n\nusing namespace std;' in content:
        content = content.replace(
            '#include "solution.cpp"\n\nusing namespace std;', 
            'using namespace std;\n\n#include "solution.cpp"'
        )
        with open(file, 'w') as f:
            f.write(content)
        print(f"Fixed {file}")
    elif '#include "solution.cpp"\nusing namespace std;' in content:
        content = content.replace(
            '#include "solution.cpp"\nusing namespace std;', 
            'using namespace std;\n#include "solution.cpp"'
        )
        with open(file, 'w') as f:
            f.write(content)
        print(f"Fixed {file}")
    else:
        # Just check if solution.cpp is included before using namespace
        if content.find('using namespace std;') > content.find('#include "solution.cpp"'):
            content = content.replace('#include "solution.cpp"', '/* placeholder */')
            content = content.replace('using namespace std;', 'using namespace std;\n#include "solution.cpp"')
            content = content.replace('/* placeholder */', '')
            with open(file, 'w') as f:
                f.write(content)
            print(f"Arbitrarily fixed {file}")
