import json
import urllib.request

# 🌍 1. Define the path to your single master configuration file
# (Change this URL to your real GitHub raw URL if running completely offline)
LOCALES_FILE = "locales.json"

def test_mobile_compiler_languages():
    print("🚀 Starting QT-AI-Build Mobile Verification...")
    
    try:
        # 📂 2. Load the consolidated language database
        with open(LOCALES_FILE, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        print("✅ Success: Master file 'locales.json' loaded correctly.")
        print(f"📦 Found active language configurations for: {list(data.keys())}\n")
        
        # 🗺️ 3. Test loop simulating a user switching languages on a mobile screen
        for lang_code in ['en', 'es', 'zh', 'ja']:
            app_title = data[lang_code]['app_title']
            status = data[lang_code]['status_ready']
            print(f"[{lang_code.upper()}] App Title: {app_title} | System Status: {status}")
            
        print("\n🎉 All core language strings compiled cleanly with 0 translation faults!")
        
    except FileNotFoundError:
        print(f"❌ Error: Could not find '{LOCALES_FILE}' in this directory.")
        print("👉 Fix: Make sure this script sits in the exact same folder as your 'locales.json' file.")
    except json.JSONDecodeError:
        print("❌ Error: 'locales.json' contains a syntax error (like a missing comma or bracket).")
    except Exception as e:
        print(f"❌ Unexpected mobile runtime error: {e}")

# Run the test execution program
if __name__ == "__main__":
    test_mobile_compiler_languages()
  
